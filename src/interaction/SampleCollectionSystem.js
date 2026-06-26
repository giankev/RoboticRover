import * as THREE from 'three';
import { COLLECTION } from '../config/constants.js';

export class SampleCollectionSystem {
  constructor({
    rover,
    targets,
    onCollectionStart = () => {},
    onCollectionEnd = () => {}
  }) {
    this.rover = rover;
    this.targets = targets;
    this.interactionDistance = COLLECTION.interactionDistance;
    this.onCollectionStart = onCollectionStart;
    this.onCollectionEnd = onCollectionEnd;

    this.isCollecting = false;
    this.state = 'idle';
    this.statusLabel = 'Ready';
    this.activeTarget = null;
    this.samplePosition = new THREE.Vector3();
  }

  activate() {
    if (this.isCollecting) {
      return;
    }

    const nearest = this.findNearestCollectibleTarget();

    if (!nearest) {
      this.statusLabel = 'No sample nearby.';
      return;
    }

    if (nearest.reason === 'too-far') {
      this.statusLabel = 'Move closer to collect.';
      return;
    }

    if (nearest.reason === 'collected') {
      this.statusLabel = 'Sample already stored.';
      return;
    }

    if (!nearest.target.sample.scanned) {
      this.statusLabel = 'Scan required.';
      return;
    }

    this.playCollectionSequence(nearest.target);
  }

  setInteractionDistance(distance) {
    this.interactionDistance = distance;
  }

  reset() {
    if (this.isCollecting) {
      return false;
    }

    this.activeTarget = null;
    this.state = 'idle';
    this.statusLabel = 'Ready';
    return true;
  }

  async playCollectionSequence(target) {
    const sampleObject = target.sample.group;
    let sampleAttachment = null;
    let sampleAttached = false;
    let sampleReleased = false;
    let sampleDeposited = false;
    let doorOpened = false;
    let completed = false;

    this.isCollecting = true;
    this.activeTarget = target;
    this.setTargetCollectionState(target, 'collecting');
    this.setState('aligning', 'Aligning sample.');

    try {
      this.onCollectionStart();
      this.getSampleWorldPosition(target, this.samplePosition);

      await this.rover.alignToScanTarget(
        this.samplePosition,
        COLLECTION.alignDuration
      );
      this.getSampleWorldPosition(target, this.samplePosition);

      this.setState('pre-grasp', 'Positioning arm.');
      await this.rover.animateArmCollectionReady(this.samplePosition);

      this.setState('opening-gripper', 'Opening gripper.');
      await this.rover.openArmGripper();

      this.setState('final-approach', 'Reaching sample.');
      await this.rover.animateArmCollectionGrab(this.samplePosition);

      const grabDistance = this.rover.getGripperHoldDistanceTo(this.samplePosition);

      if (grabDistance > COLLECTION.grabDistance) {
        throw new CollectionAbort('Move closer to collect.');
      }

      this.setState('grasping', 'Closing gripper.');
      await this.rover.closeArmGripper();
      sampleAttachment = this.captureSampleTransform(sampleObject);
      this.rover.attachSampleToGripper(sampleObject);
      sampleAttached = true;

      this.setState('lifting', 'Lifting sample.');
      await this.rover.animateArmCollectionLift(this.samplePosition);

      this.setState('pre-drop', 'Opening hatch.');
      // The raised stow pose remains outside the tray, so it can move while the
      // sliding hatch opens. This removes a dead pause without letting the
      // gripper enter the inventory before the hatch is clear.
      await Promise.all([
        this.rover.animateArmToContainer(),
        this.rover.openContainerDoor()
      ]);
      doorOpened = true;

      this.setState('dropping', 'Moving to container.');
      await this.rover.animateArmToContainerDrop();

      const dropDistance = this.rover.getGripperHoldDistanceToContainerDropHover();

      if (dropDistance > COLLECTION.dropDistance) {
        throw new CollectionAbort('Container alignment failed.');
      }

      this.setState('opening-gripper', 'Opening gripper.');
      await this.rover.openArmGripper(COLLECTION.releaseGripperDuration);

      this.setState('releasing', 'Releasing sample.');
      this.rover.releaseSampleForDrop(sampleObject);
      sampleAttached = false;
      sampleReleased = true;

      this.setState('falling', 'Storing sample.');
      const fallCompleted = await this.rover.animateSampleFallIntoContainer(
        sampleObject
      );

      if (!fallCompleted) {
        throw new CollectionAbort('Sample release interrupted.');
      }

      this.rover.depositSampleInContainer(sampleObject);
      sampleReleased = false;
      sampleDeposited = true;

      this.setTargetCollectionState(target, 'collected');
      if (target.scanMarker) {
        target.scanMarker.visible = false;
      }

      this.setState('retracting', 'Retracting arm.');
      await this.rover.animateArmToContainer();

      this.setState('closing-door', 'Closing hatch.');
      await this.rover.closeContainerDoor();
      doorOpened = false;

      this.setState('returning', 'Returning arm.');
      await this.rover.returnArmToIdle(COLLECTION.returnDuration);

      completed = true;
      this.setState('complete', 'Sample stored.');
    } catch (error) {
      const message =
        error instanceof CollectionAbort
          ? error.message
          : 'Collection interrupted.';
      this.setState('aborting', message);
    } finally {
      if (!completed && sampleAttached) {
        this.restoreSampleTransform(sampleObject, sampleAttachment);
        sampleAttached = false;
      }

      if (!completed && sampleReleased) {
        this.rover.stopSampleFallTween();
        this.restoreSampleTransform(sampleObject, sampleAttachment);
        sampleReleased = false;
      }

      if (!completed) {
        await this.recoverFromFailedCollection(doorOpened);
      }

      if (!sampleDeposited) {
        this.setTargetCollectionState(target, 'uncollected');
      } else if (!completed) {
        this.setTargetCollectionState(target, 'collected');
        if (target.scanMarker) {
          target.scanMarker.visible = false;
        }
        this.statusLabel = 'Sample stored.';
      }

      this.rover.setScannerActive(false);
      this.activeTarget = null;
      this.isCollecting = false;
      this.state = 'idle';
      this.onCollectionEnd({ completed, sampleDeposited, status: this.statusLabel });
    }
  }

  findNearestCollectibleTarget() {
    let nearestScannedUncollected = null;
    let nearestUnscannedUncollected = null;
    let nearestOutOfRangeUncollected = null;
    let nearestCollected = null;
    const roverPosition = this.rover.root.position;

    for (const target of this.targets) {
      if (!target.sample) {
        continue;
      }

      const position = this.getSampleAnchorPosition(target, this.samplePosition);
      const distance = roverPosition.distanceTo(position);

      if (distance > this.interactionDistance) {
        if (
          !target.sample.collected &&
          (!nearestOutOfRangeUncollected ||
            distance < nearestOutOfRangeUncollected.distance)
        ) {
          nearestOutOfRangeUncollected = { target, distance, reason: 'too-far' };
        }
        continue;
      }

      if (target.sample.collected) {
        if (!nearestCollected || distance < nearestCollected.distance) {
          nearestCollected = { target, distance, reason: 'collected' };
        }
        continue;
      }

      if (target.sample.scanned) {
        if (
          !nearestScannedUncollected ||
          distance < nearestScannedUncollected.distance
        ) {
          nearestScannedUncollected = { target, distance, reason: 'uncollected' };
        }
        continue;
      }

      if (
        !nearestUnscannedUncollected ||
        distance < nearestUnscannedUncollected.distance
      ) {
        nearestUnscannedUncollected = { target, distance, reason: 'uncollected' };
      }
    }

    return (
      nearestScannedUncollected ??
      nearestUnscannedUncollected ??
      nearestCollected ??
      nearestOutOfRangeUncollected
    );
  }

  getSampleAnchorPosition(target, destination) {
    if (target.sample.pickupAnchor) {
      target.sample.pickupAnchor.getWorldPosition(destination);
      return destination;
    }

    destination.copy(target.sample.anchorPosition);
    return destination;
  }

  getSamplePosition(target, destination) {
    return this.getSampleAnchorPosition(target, destination);
  }

  getSampleWorldPosition(target, destination) {
    target.sample.group.getWorldPosition(destination);
    return destination;
  }

  setState(state, label) {
    this.state = state;
    this.statusLabel = label;
  }

  captureSampleTransform(sampleObject) {
    return {
      parent: sampleObject.parent,
      position: sampleObject.position.clone(),
      quaternion: sampleObject.quaternion.clone(),
      scale: sampleObject.scale.clone()
    };
  }

  restoreSampleTransform(sampleObject, transform) {
    if (!transform?.parent) {
      return;
    }

    transform.parent.updateWorldMatrix(true, true);
    transform.parent.attach(sampleObject);
    sampleObject.position.copy(transform.position);
    sampleObject.quaternion.copy(transform.quaternion);
    sampleObject.scale.copy(transform.scale);
    sampleObject.visible = true;
    sampleObject.userData.heldByGripper = false;
  }

  async recoverFromFailedCollection(doorOpened) {
    try {
      if (doorOpened || this.rover.isContainerDoorOpen()) {
        await this.rover.animateArmToContainer();
        await this.rover.closeContainerDoor();
      }

      await this.rover.returnArmToIdle();
    } catch {
      this.rover.arm.setIdlePose();
      this.rover.forceCloseContainerDoor();
    }
  }

  setTargetCollectionState(target, state) {
    const collected = state === 'collected';

    target.collectionState = state;
    target.mesh.userData.collectionState = state;
    target.sample.collectionState = state;
    target.sample.collected = collected;
    if (target.sample.pickupAnchor) {
      target.sample.pickupAnchor.userData.collectionState = state;
      target.sample.pickupAnchor.userData.collected = collected;
    }
    target.sample.group.userData.collectionState = state;
    target.sample.group.userData.collected = collected;
    target.sample.mesh.userData.collectionState = state;
    target.sample.mesh.userData.collected = collected;

    if (collected) {
      target.sample.light.intensity = 0;
    }
  }

  get collectedCount() {
    return this.targets.filter((target) => target.sample?.collected).length;
  }

  get totalCount() {
    return this.targets.filter((target) => target.sample).length;
  }
}

class CollectionAbort extends Error {}
