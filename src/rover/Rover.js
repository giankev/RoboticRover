import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { COLLECTION, COLORS, DEBUG_PERFORMANCE, ROVER } from '../config/constants.js';
import { RoverAnimations } from './RoverAnimations.js';
import { RoverArm, createArmMaterials } from './RoverArm.js';
import { getProceduralTextures } from '../world/ProceduralTextures.js';

const FORWARD = new THREE.Vector3(0, 0, -1);
const SCANNER_TARGET_LOCAL = new THREE.Vector3();
const SCANNER_DIRECTION = new THREE.Vector3();
const TWO_PI = Math.PI * 2;

export class Rover {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'RoverRoot';
    this.root.position.set(
      ROVER.startPosition.x,
      ROVER.startPosition.y,
      ROVER.startPosition.z
    );

    this.headlightsEnabled = false;
    this.headlightCurrentIntensity = 0;
    this.headlightTargetIntensity = 0;
    this.headlightFadeSpeed = 28;
    this.headlightTime = 0;
    this.scannerActive = false;
    this.scannerAlignTween = null;
    this.scannerFocusTween = null;
    this.scannerFailureTween = null;
    this.containerDoorTween = null;
    this.resolveContainerDoorTween = null;
    this.sampleFallTween = null;
    this.resolveSampleFallTween = null;
    this.sampleDepositCount = 0;
    this.wheels = [];
    this.headlights = [];
    this.moveDirection = new THREE.Vector3();
    this.moveStep = new THREE.Vector3();
    this.candidatePosition = new THREE.Vector3();
    this.scannerOrigin = new THREE.Vector3();
    this.gripperTipPosition = new THREE.Vector3();
    this.gripperHoldPosition = new THREE.Vector3();
    this.containerDropPosition = new THREE.Vector3();
    this.containerDropHoverPosition = new THREE.Vector3();
    this.sampleDropTarget = new THREE.Vector3();

    this.textures = getProceduralTextures();
    this.materials = this.createMaterials();
    this.build();
    this.applyHeadlightState(0);

    this.animations = new RoverAnimations({
      body: this.body,
      wheels: this.wheels,
      cameraMast: this.cameraMast,
      antennaBase: this.antennaBase,
      antennaDish: this.antennaDish
    });
  }

  update(delta, movement, collisionSystem) {
    const signedSpeed = movement.throttle * ROVER.moveSpeed;
    let actualSpeed = 0;

    if (movement.turn !== 0) {
      this.root.rotation.y += movement.turn * ROVER.turnSpeed * delta;
    }

    if (movement.throttle !== 0) {
      this.moveDirection.copy(FORWARD).applyEuler(this.root.rotation);
      this.moveStep.copy(this.moveDirection).multiplyScalar(signedSpeed * delta);
      actualSpeed = this.applyMovement(this.moveStep, collisionSystem) * Math.sign(signedSpeed);
    }

    this.animations.update(delta, actualSpeed, movement.turn, {
      scannerActive: this.scannerActive
    });
    this.arm.update(delta);
    this.updateHeadlights(delta);
  }

  applyMovement(step, collisionSystem) {
    if (!collisionSystem) {
      this.root.position.add(step);
      return step.length() / Math.max(step.length(), 0.0001) * ROVER.moveSpeed;
    }

    const start = this.root.position;
    this.candidatePosition.copy(start).add(step);

    if (collisionSystem.isPositionValid(this.candidatePosition)) {
      start.copy(this.candidatePosition);
      return ROVER.moveSpeed;
    }

    const originalX = start.x;
    const originalZ = start.z;

    if (step.x !== 0) {
      this.candidatePosition.copy(start);
      this.candidatePosition.x += step.x;

      if (collisionSystem.isPositionValid(this.candidatePosition)) {
        start.x = this.candidatePosition.x;
      }
    }

    if (step.z !== 0) {
      this.candidatePosition.copy(start);
      this.candidatePosition.z += step.z;

      if (collisionSystem.isPositionValid(this.candidatePosition)) {
        start.z = this.candidatePosition.z;
      }
    }

    const movedDistance = Math.hypot(start.x - originalX, start.z - originalZ);
    return (movedDistance / Math.max(step.length(), 0.0001)) * ROVER.moveSpeed;
  }

  reset() {
    this.root.position.set(
      ROVER.startPosition.x,
      ROVER.startPosition.y,
      ROVER.startPosition.z
    );
    this.root.rotation.set(0, 0, 0);
  }

  resetMissionState() {
    this.stopSampleFallTween();
    this.forceCloseContainerDoor();
    this.arm.setIdlePose();
    this.setScannerActive(false);
    this.sampleDepositCount = 0;
    this.reset();
  }

  setArmIdle() {
    this.arm.animateToIdle();
  }

  setArmReady() {
    this.arm.animateToReady();
  }

  setArmReach() {
    this.arm.animateToReach();
  }

  toggleGripper() {
    if (this.arm.gripperOpen) {
      this.arm.closeGripper();
    } else {
      this.arm.openGripper();
    }
  }

  playArmInspectionSequence() {
    this.arm.playInspectionSequence();
  }

  setScannerActive(active) {
    this.scannerActive = active;
  }

  getScannerOrigin(target = this.scannerOrigin) {
    return this.arm.getScannerOrigin(target);
  }

  animateArmScan(worldPosition) {
    return this.arm.animateToScanPose(worldPosition);
  }

  resetArmScan() {
    return this.arm.returnFromScan();
  }

  animateArmCollectionReady(worldPosition) {
    return this.arm.animateToCollectionReady(
      worldPosition,
      COLLECTION.readyDuration
    );
  }

  animateArmCollectionGrab(worldPosition) {
    return this.arm.animateToCollectionGrab(
      worldPosition,
      COLLECTION.reachDuration
    );
  }

  animateArmCollectionLift(worldPosition) {
    return this.arm.animateToCollectionLift(
      worldPosition,
      COLLECTION.liftDuration
    );
  }

  animateArmToContainer() {
    return this.arm.animateToContainerStow(COLLECTION.stowDuration);
  }

  animateArmToContainerDrop() {
    return this.arm.animateToContainerDrop(
      this.getContainerDropHoverPosition(),
      COLLECTION.dropDuration
    );
  }

  openArmGripper(duration) {
    return this.arm.openGripper(duration);
  }

  closeArmGripper() {
    return this.arm.closeGripper();
  }

  getGripperTipPosition(target = this.gripperTipPosition) {
    return this.arm.getGripperTipPosition(target);
  }

  getGripperHoldPosition(target = this.gripperHoldPosition) {
    return this.arm.getGripperHoldPosition(target);
  }

  getContainerDropPosition(target = this.containerDropPosition) {
    this.containerDropInsideAnchor.getWorldPosition(target);
    return target;
  }

  getContainerDropHoverPosition(target = this.containerDropHoverPosition) {
    this.containerDropHoverAnchor.getWorldPosition(target);
    return target;
  }

  getGripperTipDistanceTo(worldPosition) {
    const tipPosition = this.getGripperTipPosition();
    return tipPosition.distanceTo(worldPosition);
  }

  getGripperHoldDistanceTo(worldPosition) {
    const holdPosition = this.getGripperHoldPosition();
    return holdPosition.distanceTo(worldPosition);
  }

  getGripperTipDistanceToContainerDrop() {
    const tipPosition = this.getGripperTipPosition();
    const dropPosition = this.getContainerDropPosition();
    return tipPosition.distanceTo(dropPosition);
  }

  getGripperHoldDistanceToContainerDrop() {
    const holdPosition = this.getGripperHoldPosition();
    const dropPosition = this.getContainerDropPosition();
    return holdPosition.distanceTo(dropPosition);
  }

  getGripperHoldDistanceToContainerDropHover() {
    const holdPosition = this.getGripperHoldPosition();
    const hoverPosition = this.getContainerDropHoverPosition();
    return holdPosition.distanceTo(hoverPosition);
  }

  returnArmToIdle(duration) {
    return this.arm.animateToIdle(duration);
  }

  openContainerDoor() {
    return this.animateContainerDoor(true, COLLECTION.doorDuration);
  }

  closeContainerDoor() {
    return this.animateContainerDoor(false, COLLECTION.doorDuration);
  }

  animateContainerDoor(open, duration = 520) {
    this.stopContainerDoorTween();

    const targetPosition = open
      ? this.containerDoorOpenPosition
      : this.containerDoorClosedPosition;
    const fixedY = this.containerDoorClosedPosition.y;
    const fixedZ = this.containerDoorClosedPosition.z;
    const state = { x: this.containerDoor.position.x };

    return new Promise((resolve) => {
      this.resolveContainerDoorTween = resolve;
      this.containerDoorTween = new TWEEN.Tween(state, true)
        .to({ x: targetPosition.x }, duration)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => {
          this.containerDoor.position.set(state.x, fixedY, fixedZ);
        })
        .onComplete(() => {
          this.containerDoor.position.set(targetPosition.x, fixedY, fixedZ);
          this.containerDoorTween = null;
          this.resolveContainerDoorTween = null;
          resolve(true);
        })
        .start();
    });
  }

  stopContainerDoorTween() {
    if (this.containerDoorTween) {
      this.containerDoorTween.stop();
      this.containerDoorTween = null;
    }

    if (this.resolveContainerDoorTween) {
      const resolve = this.resolveContainerDoorTween;
      this.resolveContainerDoorTween = null;
      resolve(false);
    }
  }

  isContainerDoorOpen() {
    return Math.abs(
      this.containerDoor.position.x - this.containerDoorClosedPosition.x
    ) > 0.01;
  }

  forceCloseContainerDoor() {
    this.stopContainerDoorTween();
    this.containerDoor.position.copy(this.containerDoorClosedPosition);
  }

  attachSampleToGripper(sampleObject) {
    this.arm.gripperHoldAnchor.updateWorldMatrix(true, false);
    sampleObject.updateWorldMatrix(true, true);
    this.arm.gripperHoldAnchor.attach(sampleObject);
    sampleObject.userData.heldByGripper = true;
  }

  releaseSampleForDrop(sampleObject) {
    this.sampleContainer.updateWorldMatrix(true, false);
    sampleObject.updateWorldMatrix(true, true);
    this.sampleContainer.attach(sampleObject);
    sampleObject.visible = true;
    sampleObject.userData.heldByGripper = false;
  }

  animateSampleFallIntoContainer(sampleObject, duration = COLLECTION.fallDuration) {
    this.stopSampleFallTween();
    this.sampleContainer.updateWorldMatrix(true, false);

    const targetLocal = this.sampleContainer.worldToLocal(
      this.getContainerDropPosition(this.sampleDropTarget)
    );
    const state = {
      x: sampleObject.position.x,
      y: sampleObject.position.y,
      z: sampleObject.position.z
    };

    return new Promise((resolve) => {
      this.resolveSampleFallTween = resolve;
      this.sampleFallTween = new TWEEN.Tween(state, true)
        .to(
          { x: targetLocal.x, y: targetLocal.y, z: targetLocal.z },
          duration
        )
        .easing(TWEEN.Easing.Quadratic.In)
        .onUpdate(() => {
          sampleObject.position.set(state.x, state.y, state.z);
        })
        .onComplete(() => {
          sampleObject.position.copy(targetLocal);
          this.sampleFallTween = null;
          this.resolveSampleFallTween = null;
          resolve(true);
        })
        .start();
    });
  }

  stopSampleFallTween() {
    if (this.sampleFallTween) {
      this.sampleFallTween.stop();
      this.sampleFallTween = null;
    }

    if (this.resolveSampleFallTween) {
      const resolve = this.resolveSampleFallTween;
      this.resolveSampleFallTween = null;
      resolve(false);
    }
  }

  depositSampleInContainer(sampleObject) {
    this.sampleStorageGroup.add(sampleObject);
    sampleObject.userData.heldByGripper = false;
    sampleObject.visible = false;
    sampleObject.position.set(0, 0, 0);
    this.sampleDepositCount += 1;
  }

  alignToScanTarget(worldPosition, duration = 640) {
    this.setScannerActive(true);

    if (this.scannerAlignTween) {
      this.scannerAlignTween.stop();
    }

    const dx = worldPosition.x - this.root.position.x;
    const dz = worldPosition.z - this.root.position.z;
    const horizontalDistance = Math.hypot(dx, dz);

    if (horizontalDistance <= 0.001) {
      return Promise.resolve();
    }

    const targetYaw = Math.atan2(-dx, -dz);
    const startYaw = this.root.rotation.y;
    const endYaw = startYaw + shortestAngleDelta(startYaw, targetYaw);
    const state = { yaw: startYaw };

    return new Promise((resolve) => {
      this.scannerAlignTween = new TWEEN.Tween(state, true)
        .to({ yaw: endYaw }, duration)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => {
          this.root.rotation.y = state.yaw;
        })
        .onComplete(() => {
          this.root.rotation.y = normalizeAngle(endYaw);
          this.scannerAlignTween = null;
          resolve();
        })
        .start();
    });
  }

  animateScannerFocus(worldPosition, duration = 420) {
    this.setScannerActive(true);

    if (this.scannerFocusTween) {
      this.scannerFocusTween.stop();
    }

    const rotations = this.getScannerFocusRotations(worldPosition);
    const state = {
      mastX: this.cameraMast.rotation.x,
      mastY: this.cameraMast.rotation.y,
      headX: this.cameraHead.rotation.x,
      headY: this.cameraHead.rotation.y,
      headZ: this.cameraHead.rotation.z
    };

    return new Promise((resolve) => {
      this.scannerFocusTween = new TWEEN.Tween(state, true)
        .to(rotations, duration)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => this.applyScannerFocusRotations(state))
        .onComplete(() => {
          this.applyScannerFocusRotations(rotations);
          this.scannerFocusTween = null;
          resolve();
        })
        .start();
    });
  }

  resetScannerFocus(duration = 420) {
    if (this.scannerFocusTween) {
      this.scannerFocusTween.stop();
    }

    const state = {
      mastX: this.cameraMast.rotation.x,
      mastY: this.cameraMast.rotation.y,
      headX: this.cameraHead.rotation.x,
      headY: this.cameraHead.rotation.y,
      headZ: this.cameraHead.rotation.z
    };

    return new Promise((resolve) => {
      this.scannerFocusTween = new TWEEN.Tween(state, true)
        .to({ mastX: 0, mastY: 0, headX: 0, headY: 0, headZ: 0 }, duration)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => this.applyScannerFocusRotations(state))
        .onComplete(() => {
          this.applyScannerFocusRotations({
            mastX: 0,
            mastY: 0,
            headX: 0,
            headY: 0,
            headZ: 0
          });
          this.scannerFocusTween = null;
          this.setScannerActive(false);
          resolve();
        })
        .start();
    });
  }

  playScannerFailure(duration = 720, { includeArm = false } = {}) {
    this.setScannerActive(true);

    if (this.scannerFailureTween) {
      this.scannerFailureTween.stop();
    }

    const state = { progress: 0 };
    const indicator = this.scannerIndicator.material;
    const armFailure = includeArm
      ? this.arm.playScanFailure(duration)
      : Promise.resolve();

    const cameraFailure = new Promise((resolve) => {
      this.scannerFailureTween = new TWEEN.Tween(state, true)
        .to({ progress: 1 }, duration)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(() => {
          const pulse = Math.abs(Math.sin(state.progress * Math.PI * 5));
          this.cameraHead.rotation.z = Math.sin(state.progress * Math.PI * 9) * 0.12;
          indicator.emissiveIntensity = pulse * 5;
          this.scannerIndicator.scale.setScalar(1 + pulse * 0.55);
        })
        .onComplete(() => {
          this.cameraHead.rotation.z = 0;
          indicator.emissiveIntensity = 0;
          this.scannerIndicator.scale.setScalar(1);
          this.scannerFailureTween = null;
          resolve();
        })
        .start();
    });

    return Promise.all([cameraFailure, armFailure]).then(() => {
      this.setScannerActive(false);
    });
  }

  getScannerFocusRotations(worldPosition) {
    SCANNER_TARGET_LOCAL.copy(worldPosition);
    this.root.worldToLocal(SCANNER_TARGET_LOCAL);

    SCANNER_DIRECTION
      .copy(SCANNER_TARGET_LOCAL)
      .sub(this.cameraMast.position)
      .sub(this.cameraHead.position);

    const mastY = THREE.MathUtils.clamp(
      Math.atan2(SCANNER_DIRECTION.x, -SCANNER_DIRECTION.z),
      -1.15,
      1.15
    );
    const horizontal = Math.hypot(SCANNER_DIRECTION.x, SCANNER_DIRECTION.z);
    const headX = THREE.MathUtils.clamp(
      Math.atan2(SCANNER_DIRECTION.y, horizontal),
      -0.68,
      0.55
    );

    return {
      mastX: 0,
      mastY,
      headX,
      headY: 0,
      headZ: 0
    };
  }

  applyScannerFocusRotations(rotations) {
    this.cameraMast.rotation.x = rotations.mastX;
    this.cameraMast.rotation.y = rotations.mastY;
    this.cameraHead.rotation.x = rotations.headX;
    this.cameraHead.rotation.y = rotations.headY;
    this.cameraHead.rotation.z = rotations.headZ;
  }

  toggleHeadlights() {
    const startTime = DEBUG_PERFORMANCE ? performance.now() : 0;
    this.headlightsEnabled = !this.headlightsEnabled;
    this.headlightTargetIntensity = this.headlightsEnabled ? ROVER.headlightIntensity : 0;

    if (!this.headlightsEnabled) {
      this.headlightCurrentIntensity = 0;
      this.applyHeadlightState(0);
    }

    if (DEBUG_PERFORMANCE) {
      console.info('[perf] toggleHeadlights', {
        enabled: this.headlightsEnabled,
        durationMs: Number((performance.now() - startTime).toFixed(2))
      });
    }
  }

  updateHeadlights(delta) {
    this.headlightTime += delta;

    if (
      this.headlightCurrentIntensity === this.headlightTargetIntensity &&
      !this.headlightsEnabled
    ) {
      return;
    }

    if (this.headlightCurrentIntensity !== this.headlightTargetIntensity) {
      const blend = Math.min(1, delta * this.headlightFadeSpeed);
      this.headlightCurrentIntensity = THREE.MathUtils.lerp(
        this.headlightCurrentIntensity,
        this.headlightTargetIntensity,
        blend
      );

      if (Math.abs(this.headlightCurrentIntensity - this.headlightTargetIntensity) < 1) {
        this.headlightCurrentIntensity = this.headlightTargetIntensity;
      }
    }

    this.applyHeadlightState(this.headlightCurrentIntensity);
  }

  applyHeadlightState(intensity) {
    const ratio = THREE.MathUtils.clamp(intensity / ROVER.headlightIntensity, 0, 1);
    const isVisible = this.headlightsEnabled && ratio > 0.02;
    const shimmer = isVisible
      ? 1 + Math.sin(this.headlightTime * 8.7) * 0.014 +
        Math.sin(this.headlightTime * 13.1) * 0.008
      : 1;
    const appliedIntensity = intensity * shimmer;

    for (const light of this.headlights) {
      light.intensity = appliedIntensity;
      light.visible = true;
    }

    for (const lens of this.headlightLenses) {
      lens.material.emissiveIntensity = ratio * 8.5 * shimmer;
      lens.material.emissive.setHex(isVisible ? COLORS.headlight : 0x000000);
      lens.material.color.setHex(isVisible ? COLORS.headlight : 0x1a242d);
    }

  }

  build() {
    this.body = this.createBody();
    this.wheelsGroup = this.createWheels();
    this.cameraMast = this.createCameraMast();
    this.antennaBase = this.createAntenna();
    this.headlightsGroup = this.createHeadlights();
    this.sampleContainer = this.createSampleContainer();
    this.arm = new RoverArm(createArmMaterials());

    // This makes the inventory inherit the body bob and tilt applied while
    // driving, while keeping all tray, door, and deposit anchors together.
    this.body.add(this.sampleContainer);

    this.root.add(
      this.body,
      this.wheelsGroup,
      this.cameraMast,
      this.antennaBase,
      this.headlightsGroup,
      this.arm.root
    );
  }

  createBody() {
    const body = new THREE.Group();
    body.name = 'Body';
    body.position.y = 0.86;

    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(2.04, 0.54, 1.34),
      this.materials.body
    );
    chassis.name = 'MainChassis';
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    body.add(chassis);

    const topDeck = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.2, 0.96),
      this.materials.panel
    );
    topDeck.name = 'UpperDeck';
    topDeck.position.set(0, 0.42, -0.02);
    topDeck.castShadow = true;
    topDeck.receiveShadow = true;
    body.add(topDeck);

    const frontPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.16, 0.16, 0.08),
      this.materials.accent
    );
    frontPlate.name = 'FrontInstrumentPlate';
    frontPlate.position.set(0, 0.02, -0.73);
    frontPlate.castShadow = true;
    frontPlate.receiveShadow = true;
    body.add(frontPlate);

    return body;
  }

  createWheels() {
    const wheelsGroup = new THREE.Group();
    wheelsGroup.name = 'WheelsGroup';
    wheelsGroup.position.y = 0.38;

    const wheelPositions = [
      [-1.2, 0, -0.57],
      [1.2, 0, -0.57],
      [-1.2, 0, 0],
      [1.2, 0, 0],
      [-1.2, 0, 0.57],
      [1.2, 0, 0.57]
    ];

    wheelPositions.forEach(([x, y, z], index) => {
      const wheel = new THREE.Group();
      wheel.name = `Wheel_${index + 1}`;
      wheel.position.set(x, y, z);

      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(ROVER.wheelRadius, ROVER.wheelRadius, 0.3, 24),
        this.materials.tire
      );
      tire.name = `Wheel_${index + 1}_Tire`;
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      tire.receiveShadow = true;

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.34, 18),
        this.materials.hub
      );
      hub.name = `Wheel_${index + 1}_Hub`;
      hub.rotation.z = Math.PI / 2;
      hub.castShadow = true;
      hub.receiveShadow = true;

      const axle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.6, 10),
        this.materials.trim
      );
      axle.name = `Wheel_${index + 1}_Axle`;
      axle.rotation.z = Math.PI / 2;
      axle.position.x = x > 0 ? -0.42 : 0.42;
      axle.castShadow = true;

      wheel.add(tire, hub, axle);
      wheelsGroup.add(wheel);
      this.wheels.push(wheel);
    });

    return wheelsGroup;
  }

  createCameraMast() {
    const cameraMast = new THREE.Group();
    cameraMast.name = 'CameraMast';
    cameraMast.position.set(-0.38, 1.4, -0.2);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.065, 0.96, 12),
      this.materials.trim
    );
    mast.name = 'CameraMastColumn';
    mast.position.y = 0.48;
    mast.castShadow = true;
    cameraMast.add(mast);

    const cameraHead = new THREE.Group();
    cameraHead.name = 'CameraHead';
    cameraHead.position.set(0, 1.02, -0.05);

    const cameraHeadHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.24, 0.28),
      this.materials.panel
    );
    cameraHeadHousing.name = 'CameraHeadHousing';
    cameraHeadHousing.castShadow = true;
    cameraHeadHousing.receiveShadow = true;
    cameraHead.add(cameraHeadHousing);

    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.05, 18),
      this.materials.lens
    );
    lens.name = 'CameraLens';
    lens.position.set(0, 0, -0.17);
    lens.rotation.x = Math.PI / 2;
    cameraHead.add(lens);

    const scannerIndicator = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 12, 8),
      this.materials.scannerIndicator.clone()
    );
    scannerIndicator.name = 'ScannerStatusLED';
    scannerIndicator.position.set(0.17, 0.06, -0.17);
    cameraHead.add(scannerIndicator);

    cameraMast.add(cameraHead);
    this.cameraHead = cameraHead;
    this.cameraLens = lens;
    this.scannerIndicator = scannerIndicator;

    return cameraMast;
  }

  createAntenna() {
    const antennaBase = new THREE.Group();
    antennaBase.name = 'AntennaBase';
    antennaBase.position.set(0.48, 1.4, 0.28);

    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, 0.72, 10),
      this.materials.trim
    );
    stalk.name = 'AntennaStalk';
    stalk.position.y = 0.36;
    stalk.castShadow = true;

    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      this.materials.accent
    );
    dish.name = 'AntennaDish';
    dish.position.y = 0.78;
    dish.rotation.x = Math.PI * 0.55;
    dish.scale.set(1.25, 0.42, 1.25);
    dish.castShadow = true;

    antennaBase.add(stalk, dish);
    this.antennaDish = dish;
    return antennaBase;
  }

  createHeadlights() {
    const headlights = new THREE.Group();
    headlights.name = 'Headlights';
    headlights.position.set(0, 0.9, -0.78);
    this.headlightLenses = [];

    [-0.42, 0.42].forEach((x, index) => {
      const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.12, 18),
        this.materials.trim
      );
      housing.name = `HeadlightHousing_${index + 1}`;
      housing.position.set(x, 0, -0.02);
      housing.rotation.x = Math.PI / 2;
      housing.castShadow = true;

      const lensMaterial = this.materials.headlightLens.clone();
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.095, 0.095, 0.02, 18),
        lensMaterial
      );
      lens.name = `HeadlightLens_${index + 1}`;
      lens.position.set(x, 0, -0.095);
      lens.rotation.x = Math.PI / 2;

      const light = new THREE.SpotLight(
        COLORS.headlight,
        0,
        ROVER.headlightDistance,
        ROVER.headlightAngle,
        ROVER.headlightPenumbra,
        ROVER.headlightDecay
      );
      light.name = `HeadlightBeam_${index + 1}`;
      light.position.set(x, 0.12, -0.08);
      // Keep the SpotLights resident at zero intensity so toggling F does not
      // trigger shader or shadow-map setup during gameplay.
      light.visible = true;
      light.castShadow = false;

      const target = new THREE.Object3D();
      target.name = `HeadlightTarget_${index + 1}`;
      target.position.set(x * 0.14, -0.72, -58);
      light.target = target;

      headlights.add(housing, lens, light, target);
      this.headlights.push(light);
      this.headlightLenses.push(lens);
    });

    return headlights;
  }

  createSampleContainer() {
    const sampleContainer = new THREE.Group();
    sampleContainer.name = 'SampleContainer';
    sampleContainer.position.set(-0.62, 0.57, 0.34);

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 0.07, 0.58),
      this.materials.container
    );
    floor.name = 'SampleContainerFloor';
    floor.position.y = 0.035;
    floor.castShadow = true;
    floor.receiveShadow = true;

    const wallDefinitions = [
      ['LeftWall', new THREE.BoxGeometry(0.06, 0.28, 0.58), [-0.29, 0.175, 0]],
      ['RightWall', new THREE.BoxGeometry(0.06, 0.28, 0.58), [0.29, 0.175, 0]],
      ['FrontWall', new THREE.BoxGeometry(0.52, 0.28, 0.06), [0, 0.175, -0.26]],
      ['BackWall', new THREE.BoxGeometry(0.52, 0.28, 0.06), [0, 0.175, 0.26]]
    ];
    const rimDefinitions = [
      ['LeftRim', new THREE.BoxGeometry(0.06, 0.045, 0.64), [-0.32, 0.315, 0]],
      ['RightRim', new THREE.BoxGeometry(0.06, 0.045, 0.64), [0.32, 0.315, 0]],
      ['FrontRim', new THREE.BoxGeometry(0.58, 0.045, 0.06), [0, 0.315, -0.29]],
      ['BackRim', new THREE.BoxGeometry(0.58, 0.045, 0.06), [0, 0.315, 0.29]]
    ];

    const walls = wallDefinitions.map(([name, geometry, position]) =>
      this.createContainerPiece(`SampleContainer${name}`, geometry, position, this.materials.container)
    );
    const rimRails = rimDefinitions.map(([name, geometry, position]) =>
      this.createContainerPiece(`SampleContainer${name}`, geometry, position, this.materials.trim)
    );

    const mountingPads = [
      this.createContainerPiece(
        'SampleContainerMountLeft',
        new THREE.BoxGeometry(0.16, 0.04, 0.22),
        [-0.2, -0.02, 0],
        this.materials.trim
      ),
      this.createContainerPiece(
        'SampleContainerMountRight',
        new THREE.BoxGeometry(0.16, 0.04, 0.22),
        [0.2, -0.02, 0],
        this.materials.trim
      )
    ];

    const doorRailGroup = new THREE.Group();
    doorRailGroup.name = 'ContainerDoorRailGroup';
    const doorGuideDefinitions = [
      ['Front', [-0.42, 0.36, -0.34]],
      ['Back', [-0.42, 0.36, 0.34]]
    ];
    doorGuideDefinitions.forEach(([name, position]) => {
      const guide = this.createContainerPiece(
        `ContainerDoorGuide${name}`,
        new THREE.BoxGeometry(1.56, 0.035, 0.035),
        position,
        this.materials.trim
      );
      doorRailGroup.add(guide);
    });

    const door = new THREE.Group();
    door.name = 'ContainerHatch';
    const fixedDoorY = 0.39;
    const closedPosition = new THREE.Vector3(0, fixedDoorY, 0);
    const openPosition = new THREE.Vector3(-0.84, fixedDoorY, 0);
    door.position.copy(closedPosition);

    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.045, 0.64),
      this.materials.panel
    );
    doorPanel.name = 'ContainerHatchPanel';
    doorPanel.castShadow = true;
    doorPanel.receiveShadow = true;
    door.add(doorPanel);

    const doorHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.035, 0.045),
      this.materials.accent
    );
    doorHandle.name = 'ContainerHatchHandle';
    doorHandle.position.set(0, 0.035, -0.3);
    doorHandle.castShadow = true;
    door.add(doorHandle);

    const depositPosition = new THREE.Vector3(0, 0.12, 0);
    const storageGroup = new THREE.Group();
    storageGroup.name = 'CollectedSamples';
    storageGroup.position.copy(depositPosition);

    const dropInsideAnchor = new THREE.Object3D();
    dropInsideAnchor.name = 'ContainerDropInsideAnchor';
    dropInsideAnchor.position.copy(depositPosition);

    const dropHoverAnchor = new THREE.Object3D();
    dropHoverAnchor.name = 'ContainerDropHoverAnchor';
    dropHoverAnchor.position.set(0, 0.65, 0);

    doorRailGroup.add(door);
    sampleContainer.add(
      floor,
      ...walls,
      ...rimRails,
      ...mountingPads,
      storageGroup,
      dropInsideAnchor,
      dropHoverAnchor,
      doorRailGroup
    );
    this.containerDoor = door;
    this.containerDoorRailGroup = doorRailGroup;
    this.containerDoorClosedPosition = closedPosition;
    this.containerDoorOpenPosition = openPosition;
    this.containerDoorFixedY = fixedDoorY;
    this.sampleStorageGroup = storageGroup;
    this.containerDropAnchor = dropInsideAnchor;
    this.containerDropInsideAnchor = dropInsideAnchor;
    this.containerDropHoverAnchor = dropHoverAnchor;
    return sampleContainer;
  }

  createContainerPiece(name, geometry, position, material) {
    const piece = new THREE.Mesh(geometry, material);
    piece.name = name;
    piece.position.set(...position);
    piece.castShadow = true;
    piece.receiveShadow = true;
    return piece;
  }

  createMaterials() {
    const { roverMetal, roverTrim, rock } = this.textures;

    return {
      body: new THREE.MeshStandardMaterial({
        color: 0xd8e8eb,
        map: roverMetal.map,
        normalMap: roverMetal.normalMap,
        normalScale: new THREE.Vector2(0.2, 0.2),
        roughnessMap: roverMetal.roughnessMap,
        metalnessMap: roverMetal.metalnessMap,
        roughness: 0.38,
        metalness: 0.48
      }),
      panel: new THREE.MeshStandardMaterial({
        color: 0xb3cbd1,
        map: roverMetal.map,
        normalMap: roverMetal.normalMap,
        normalScale: new THREE.Vector2(0.16, 0.16),
        roughnessMap: roverMetal.roughnessMap,
        metalnessMap: roverMetal.metalnessMap,
        roughness: 0.34,
        metalness: 0.56
      }),
      trim: new THREE.MeshStandardMaterial({
        color: 0x314b58,
        map: roverTrim.map,
        normalMap: roverTrim.normalMap,
        normalScale: new THREE.Vector2(0.18, 0.18),
        roughnessMap: roverTrim.roughnessMap,
        metalnessMap: roverTrim.metalnessMap,
        roughness: 0.42,
        metalness: 0.62
      }),
      tire: new THREE.MeshStandardMaterial({
        color: COLORS.roverDark,
        map: rock.map,
        normalMap: rock.normalMap,
        normalScale: new THREE.Vector2(0.38, 0.38),
        roughnessMap: rock.roughnessMap,
        roughness: 0.84,
        metalness: 0.04
      }),
      hub: new THREE.MeshStandardMaterial({
        color: COLORS.amber,
        map: roverMetal.map,
        roughness: 0.3,
        metalness: 0.58
      }),
      accent: new THREE.MeshStandardMaterial({
        color: COLORS.amber,
        map: roverMetal.map,
        roughness: 0.34,
        metalness: 0.42
      }),
      container: new THREE.MeshStandardMaterial({
        color: 0x6f99a7,
        map: roverTrim.map,
        normalMap: roverTrim.normalMap,
        normalScale: new THREE.Vector2(0.16, 0.16),
        roughnessMap: roverTrim.roughnessMap,
        metalnessMap: roverTrim.metalnessMap,
        roughness: 0.48,
        metalness: 0.35
      }),
      lens: new THREE.MeshStandardMaterial({
        color: 0x101a24,
        roughness: 0.22,
        metalness: 0.3
      }),
      scannerIndicator: new THREE.MeshStandardMaterial({
        color: COLORS.scannerFailure,
        emissive: COLORS.scannerFailure,
        emissiveIntensity: 0,
        roughness: 0.28,
        metalness: 0.08
      }),
      headlightLens: new THREE.MeshStandardMaterial({
        color: 0x1a242d,
        emissive: 0x000000,
        emissiveIntensity: 0,
        roughness: 0.2,
        metalness: 0.08
      })
    };
  }
}

function shortestAngleDelta(from, to) {
  return normalizeAngle(to - from);
}

function normalizeAngle(angle) {
  return THREE.MathUtils.euclideanModulo(angle + Math.PI, TWO_PI) - Math.PI;
}
