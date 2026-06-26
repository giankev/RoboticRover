import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { COLORS } from '../config/constants.js';
import { getProceduralTextures } from '../world/ProceduralTextures.js';

const ARM = {
  upperLength: 1.08,
  forearmLength: 0.92,
  gripperReach: 0.34,
  gripperHoldReach: 0.38
};

const SCAN_BASE_LIMITS = {
  min: -0.55,
  max: 1.55
};

const ARM_POSES = {
  idle: {
    baseYaw: -0.35,
    shoulderPitch: 1.05,
    elbowBend: -1.58,
    wristPitch: 0.68,
    wristRoll: 0,
    gripper: 0
  },
  ready: {
    baseYaw: 0.36,
    shoulderPitch: 1.24,
    elbowBend: -0.92,
    wristPitch: -0.24,
    wristRoll: 0,
    gripper: 0
  },
  reach: {
    baseYaw: 0.86,
    shoulderPitch: 0.34,
    elbowBend: -0.16,
    wristPitch: -0.22,
    wristRoll: 0.18,
    gripper: 1
  },
  scan: {
    baseYaw: 0.92,
    shoulderPitch: 0.52,
    elbowBend: -0.72,
    wristPitch: -0.42,
    wristRoll: 0.08,
    gripper: 0.42
  },
  collectReady: {
    baseYaw: 1.2,
    shoulderPitch: 0.86,
    elbowBend: -0.78,
    wristPitch: -0.42,
    wristRoll: 0.04,
    gripper: 1
  },
  collectGrab: {
    baseYaw: 1.35,
    shoulderPitch: -0.24,
    elbowBend: -0.58,
    wristPitch: 0.02,
    wristRoll: 0.02,
    gripper: 1
  },
  collectLift: {
    baseYaw: 1.35,
    shoulderPitch: 0.92,
    elbowBend: -0.84,
    wristPitch: -0.5,
    wristRoll: 0.02,
    gripper: 0
  },
  containerStow: {
    baseYaw: -2.52,
    shoulderPitch: 1.35,
    elbowBend: -1.65,
    wristPitch: -0.1,
    wristRoll: -0.18,
    gripper: 0
  },
  containerDrop: {
    baseYaw: -2.52,
    shoulderPitch: 1.2,
    elbowBend: -2.0,
    wristPitch: 0,
    wristRoll: -0.18,
    gripper: 0
  }
};

const ARM_TARGET_LOCAL = new THREE.Vector3();
const ARM_TARGET_DIRECTION = new THREE.Vector3();
const COLLECTION_TARGET_LOCAL = new THREE.Vector3();

export class RoverArm {
  constructor(materials) {
    this.materials = materials;
    this.root = new THREE.Group();
    this.root.name = 'RoboticArmBase';
    this.root.position.set(0.58, 1.34, -0.48);

    this.status = 'Idle';
    this.elapsed = 0;
    this.gripperOpen = false;
    this.sequenceToken = 0;
    this.activeTween = null;
    this.resolveActiveTween = null;
    this.poseState = { ...ARM_POSES.idle };

    this.build();
    this.setIdlePose();
  }

  build() {
    const baseHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.38, 0.26, 24),
      this.materials.trim
    );
    baseHousing.name = 'RoboticArmBaseHousing';
    baseHousing.position.y = 0.04;
    baseHousing.castShadow = true;
    baseHousing.receiveShadow = true;
    this.root.add(baseHousing);

    const turntable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.1, 24),
      this.materials.accent
    );
    turntable.name = 'RoboticArmBaseTurntable';
    turntable.position.y = 0.22;
    turntable.castShadow = true;
    turntable.receiveShadow = true;
    this.root.add(turntable);

    this.shoulder = this.createJointGroup('Shoulder', 0, 0.36, 0, 0.22);
    this.root.add(this.shoulder);

    this.upperArm = new THREE.Group();
    this.upperArm.name = 'UpperArm';
    this.shoulder.add(this.upperArm);
    this.upperArm.add(this.createLimbMesh('UpperArmLink', ARM.upperLength, 0.105));
    this.upperArm.add(this.createSideRail('UpperArmUpperRail', ARM.upperLength, 0.16));
    this.upperArm.add(this.createSideRail('UpperArmLowerRail', ARM.upperLength, -0.16));

    this.elbow = this.createJointGroup('Elbow', ARM.upperLength, 0, 0, 0.19);
    this.upperArm.add(this.elbow);

    this.forearm = new THREE.Group();
    this.forearm.name = 'Forearm';
    this.elbow.add(this.forearm);
    this.forearm.add(this.createLimbMesh('ForearmLink', ARM.forearmLength, 0.095));
    this.forearm.add(this.createForearmSensor());

    this.wrist = this.createJointGroup('Wrist', ARM.forearmLength, 0, 0, 0.15);
    this.forearm.add(this.wrist);

    this.gripper = new THREE.Group();
    this.gripper.name = 'Gripper';
    this.gripper.position.x = ARM.gripperReach;
    this.wrist.add(this.gripper);

    const palm = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.2, 0.24),
      this.materials.trim
    );
    palm.name = 'GripperPalm';
    palm.position.x = -0.1;
    palm.castShadow = true;
    palm.receiveShadow = true;
    this.gripper.add(palm);

    this.leftClaw = this.createClaw('LeftClaw', -0.15, 1);
    this.rightClaw = this.createClaw('RightClaw', 0.15, -1);

    this.gripperHoldAnchor = new THREE.Object3D();
    this.gripperHoldAnchor.name = 'GripperHoldAnchor';
    this.gripperHoldAnchor.position.set(ARM.gripperHoldReach, 0, 0);

    this.gripperTipAnchor = new THREE.Object3D();
    this.gripperTipAnchor.name = 'GripperTipAnchor';
    this.gripperTipAnchor.position.set(0.5, 0, 0);

    this.gripper.add(
      this.leftClaw,
      this.rightClaw,
      this.gripperHoldAnchor,
      this.gripperTipAnchor
    );
  }

  setIdlePose() {
    this.stopActiveTween();
    this.sequenceToken += 1;
    this.status = 'Idle';
    this.gripperOpen = false;
    Object.assign(this.poseState, ARM_POSES.idle);
    this.applyPoseState();
  }

  animateToIdle(duration = 900) {
    this.sequenceToken += 1;
    this.status = 'Idle';
    this.gripperOpen = false;
    return this.tweenToState(ARM_POSES.idle, duration);
  }

  animateToReady() {
    this.sequenceToken += 1;
    this.status = 'Ready';
    this.gripperOpen = false;
    return this.tweenToState(ARM_POSES.ready, 850);
  }

  animateToReach() {
    this.sequenceToken += 1;
    this.status = 'Reach';
    this.gripperOpen = true;
    return this.tweenToState(ARM_POSES.reach, 1050);
  }

  openGripper(duration = 300) {
    this.sequenceToken += 1;
    if (this.status === 'Inspecting') {
      this.status = 'Ready';
    }
    this.gripperOpen = true;
    return this.tweenToState({ gripper: 1 }, duration, TWEEN.Easing.Cubic.Out);
  }

  closeGripper() {
    this.sequenceToken += 1;
    if (this.status === 'Inspecting') {
      this.status = 'Ready';
    }
    this.gripperOpen = false;
    return this.tweenToState({ gripper: 0 }, 300, TWEEN.Easing.Cubic.Out);
  }

  async playInspectionSequence() {
    const token = this.sequenceToken + 1;
    this.sequenceToken = token;
    this.status = 'Inspecting';
    this.gripperOpen = false;

    await this.tweenToState({ baseYaw: 0.94 }, 700);
    if (!this.isSequenceActive(token)) return;

    await this.tweenToState({ shoulderPitch: 1.28 }, 760);
    if (!this.isSequenceActive(token)) return;

    await this.tweenToState({ elbowBend: -0.62 }, 720);
    if (!this.isSequenceActive(token)) return;

    await this.tweenToState({ wristPitch: -0.42, wristRoll: -0.42 }, 620);
    if (!this.isSequenceActive(token)) return;

    this.gripperOpen = true;
    await this.tweenToState({ gripper: 1 }, 450, TWEEN.Easing.Cubic.Out);
    if (!this.isSequenceActive(token)) return;

    this.gripperOpen = false;
    await this.tweenToState({ gripper: 0 }, 450, TWEEN.Easing.Cubic.In);
    if (!this.isSequenceActive(token)) return;

    await this.tweenToState(ARM_POSES.idle, 1000);
    if (!this.isSequenceActive(token)) return;

    this.status = 'Idle';
  }

  async animateToScanPose(worldPosition) {
    const token = this.sequenceToken + 1;
    this.sequenceToken = token;
    this.status = 'Scan ready';
    this.gripperOpen = true;

    const scanPose = this.getScanPose(worldPosition);

    await this.tweenToState(
      {
        ...ARM_POSES.ready,
        baseYaw: THREE.MathUtils.lerp(this.poseState.baseYaw, scanPose.baseYaw, 0.5),
        gripper: 0.18
      },
      520
    );
    if (!this.isSequenceActive(token)) return;

    await this.tweenToState(scanPose, 760);
    if (!this.isSequenceActive(token)) return;

    this.status = 'Scanning';
  }

  async returnFromScan() {
    const token = this.sequenceToken + 1;
    this.sequenceToken = token;
    this.status = 'Returning';
    this.gripperOpen = false;

    await this.tweenToState(ARM_POSES.idle, 780);
    if (!this.isSequenceActive(token)) return;

    this.status = 'Idle';
  }

  animateToCollectionReady(worldPosition, duration = 720) {
    this.sequenceToken += 1;
    this.status = 'Collection ready';
    this.gripperOpen = true;
    return this.tweenToState(
      this.getCollectionPose(worldPosition, ARM_POSES.collectReady),
      duration
    );
  }

  animateToCollectionGrab(worldPosition, duration = 940) {
    this.sequenceToken += 1;
    this.status = 'Reaching sample';
    this.gripperOpen = true;
    return this.tweenToState(
      this.getCollectionApproachPose(worldPosition),
      duration
    );
  }

  animateToCollectionLift(worldPosition, duration = 760) {
    this.sequenceToken += 1;
    this.status = 'Lifting sample';
    this.gripperOpen = false;
    return this.tweenToState(
      this.getCollectionPose(worldPosition, ARM_POSES.collectLift),
      duration
    );
  }

  animateToContainerStow(duration = 900) {
    this.sequenceToken += 1;
    this.status = 'Stowing sample';
    this.gripperOpen = false;
    return this.tweenToState(ARM_POSES.containerStow, duration);
  }

  animateToContainerDrop(worldPosition, duration = 620) {
    this.sequenceToken += 1;
    this.status = 'Hovering over container';
    this.gripperOpen = false;
    return this.tweenToState(
      this.getCollectionApproachPose(worldPosition, 0),
      duration
    );
  }

  playScanFailure(duration = 720) {
    this.sequenceToken += 1;
    this.stopActiveTween();

    const previousStatus = this.status;
    const previousPose = { ...this.poseState };
    const state = { progress: 0 };
    this.status = 'Scan failed';

    return new Promise((resolve) => {
      this.resolveActiveTween = resolve;
      this.activeTween = new TWEEN.Tween(state, true)
        .to({ progress: 1 }, duration)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(() => {
          const shake = Math.sin(state.progress * Math.PI * 7) * (1 - state.progress);
          this.poseState.baseYaw = previousPose.baseYaw + shake * 0.16;
          this.poseState.wristRoll = previousPose.wristRoll - shake * 0.28;
          this.poseState.gripper = THREE.MathUtils.clamp(
            previousPose.gripper + Math.abs(shake) * 0.35,
            0,
            1
          );
          this.applyPoseState();
        })
        .onComplete(() => {
          Object.assign(this.poseState, previousPose);
          this.gripperOpen = previousPose.gripper > 0.5;
          this.applyPoseState();
          this.activeTween = null;
          this.resolveActiveTween = null;
          this.status = previousStatus;
          resolve();
        })
        .start();
    });
  }

  getScannerOrigin(target = new THREE.Vector3()) {
    target.set(0.38, 0, 0);
    this.gripper.localToWorld(target);
    return target;
  }

  getGripperTipPosition(target = new THREE.Vector3()) {
    this.gripperTipAnchor.getWorldPosition(target);
    return target;
  }

  getGripperHoldPosition(target = new THREE.Vector3()) {
    this.gripperHoldAnchor.getWorldPosition(target);
    return target;
  }

  update(delta) {
    this.elapsed += delta;

    if (this.status === 'Idle' && !this.activeTween) {
      const servoHum = Math.sin(this.elapsed * 1.8) * 0.015;
      this.wrist.rotation.x = this.poseState.wristRoll + servoHum;
    }
  }

  tweenToState(targetState, duration = 600, easing = TWEEN.Easing.Cubic.InOut) {
    this.stopActiveTween();

    return new Promise((resolve) => {
      this.resolveActiveTween = resolve;
      this.activeTween = new TWEEN.Tween(this.poseState, true)
        .to(targetState, duration)
        .easing(easing)
        .onUpdate(() => this.applyPoseState())
        .onComplete(() => {
          this.applyPoseState();
          this.activeTween = null;
          this.resolveActiveTween = null;
          resolve();
        })
        .start();
    });
  }

  stopActiveTween() {
    if (this.activeTween) {
      this.activeTween.stop();
      this.activeTween = null;
    }

    if (this.resolveActiveTween) {
      this.resolveActiveTween();
      this.resolveActiveTween = null;
    }
  }

  isSequenceActive(token) {
    return this.sequenceToken === token;
  }

  applyPoseState() {
    this.root.rotation.y = this.poseState.baseYaw;
    this.shoulder.rotation.z = this.poseState.shoulderPitch;
    this.elbow.rotation.z = this.poseState.elbowBend;
    this.wrist.rotation.z = this.poseState.wristPitch;
    this.wrist.rotation.x = this.poseState.wristRoll;
    this.setClawOpenAmount(this.poseState.gripper);
  }

  getScanPose(worldPosition) {
    const baseYaw = THREE.MathUtils.clamp(
      this.getTargetBaseYaw(worldPosition),
      SCAN_BASE_LIMITS.min,
      SCAN_BASE_LIMITS.max
    );

    return {
      ...ARM_POSES.scan,
      baseYaw
    };
  }

  getCollectionPose(worldPosition, basePose) {
    return {
      ...basePose,
      baseYaw: THREE.MathUtils.clamp(
        this.getTargetBaseYaw(worldPosition),
        -1.25,
        1.65
      )
    };
  }

  getCollectionApproachPose(worldPosition, gripper = 1) {
    const baseYaw = this.getTargetBaseYaw(worldPosition);
    const previousYaw = this.root.rotation.y;

    // The arm links rotate in their local X/Y plane. Temporarily aim the base
    // at the target to solve that plane, then restore the displayed pose until
    // the tween begins.
    this.root.rotation.y = baseYaw;
    this.root.updateWorldMatrix(true, false);
    COLLECTION_TARGET_LOCAL.copy(worldPosition);
    this.root.worldToLocal(COLLECTION_TARGET_LOCAL);
    this.root.rotation.y = previousYaw;
    this.root.updateWorldMatrix(true, false);

    const shoulderHeight = 0.36;
    const upperLength = ARM.upperLength;
    const forearmToHoldLength =
      ARM.forearmLength + ARM.gripperReach + ARM.gripperHoldReach;
    const targetX = COLLECTION_TARGET_LOCAL.x;
    const targetY = COLLECTION_TARGET_LOCAL.y - shoulderHeight;
    const targetDistance = Math.hypot(targetX, targetY);
    const minReach = Math.abs(upperLength - forearmToHoldLength) + 0.001;
    const maxReach = upperLength + forearmToHoldLength - 0.001;
    const solvedDistance = THREE.MathUtils.clamp(
      targetDistance,
      minReach,
      maxReach
    );
    const elbowCosine = THREE.MathUtils.clamp(
      (solvedDistance ** 2 - upperLength ** 2 - forearmToHoldLength ** 2) /
        (2 * upperLength * forearmToHoldLength),
      -1,
      1
    );
    const elbowBend = -Math.acos(elbowCosine);
    const shoulderPitch =
      Math.atan2(targetY, targetX) -
      Math.atan2(
        forearmToHoldLength * Math.sin(elbowBend),
        upperLength + forearmToHoldLength * Math.cos(elbowBend)
      );

    return {
      ...ARM_POSES.collectGrab,
      baseYaw,
      shoulderPitch,
      elbowBend,
      wristPitch: 0,
      wristRoll: 0.02,
      gripper
    };
  }

  getTargetBaseYaw(worldPosition) {
    ARM_TARGET_LOCAL.copy(worldPosition);

    if (this.root.parent) {
      this.root.parent.worldToLocal(ARM_TARGET_LOCAL);
    }

    ARM_TARGET_DIRECTION.copy(ARM_TARGET_LOCAL).sub(this.root.position);
    return Math.atan2(-ARM_TARGET_DIRECTION.z, ARM_TARGET_DIRECTION.x);
  }

  setClawOpenAmount(amount) {
    const openness = THREE.MathUtils.clamp(amount, 0, 1);
    const closedAngle = 0.06;
    const openAngle = 0.58;

    this.leftClaw.rotation.y = closedAngle + openness * (openAngle - closedAngle);
    this.rightClaw.rotation.y = -this.leftClaw.rotation.y;
  }

  createJointGroup(name, x, y, z, radius) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(x, y, z);

    const joint = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 18, 12),
      this.materials.accent
    );
    joint.name = `${name}Joint`;
    joint.castShadow = true;
    joint.receiveShadow = true;

    const axle = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.34, radius * 0.34, radius * 2.45, 14),
      this.materials.trim
    );
    axle.name = `${name}Axle`;
    axle.rotation.x = Math.PI / 2;
    axle.castShadow = true;
    axle.receiveShadow = true;

    group.add(joint, axle);

    return group;
  }

  createLimbMesh(name, length, radius) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.05, length, 12),
      this.materials.arm
    );
    mesh.name = name;
    mesh.position.x = length / 2;
    mesh.rotation.z = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  createSideRail(name, length, z) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.06, 0.055),
      this.materials.trim
    );
    rail.name = name;
    rail.position.set(length / 2, 0, z);
    rail.castShadow = true;
    rail.receiveShadow = true;
    return rail;
  }

  createForearmSensor() {
    const sensor = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.16, 0.24),
      this.materials.accent
    );
    sensor.name = 'ForearmServoPack';
    sensor.position.set(0.38, 0.1, 0);
    sensor.castShadow = true;
    sensor.receiveShadow = true;
    return sensor;
  }

  createClaw(name, z, openSign) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(0.04, 0, z);
    group.userData.openSign = openSign;

    const lower = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.075, 0.07),
      this.materials.claw
    );
    lower.name = `${name}LowerSegment`;
    lower.position.x = 0.22;
    lower.castShadow = true;
    lower.receiveShadow = true;

    const tip = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.075, 0.07),
      this.materials.claw
    );
    tip.name = `${name}Tip`;
    tip.position.set(0.46, 0, openSign * -0.05);
    tip.rotation.y = openSign * -0.45;
    tip.castShadow = true;
    tip.receiveShadow = true;

    group.add(lower, tip);
    return group;
  }
}

export function createArmMaterials() {
  const { roverMetal, roverTrim, rock } = getProceduralTextures();

  return {
    arm: new THREE.MeshStandardMaterial({
      color: 0xd2e3e7,
      map: roverMetal.map,
      normalMap: roverMetal.normalMap,
      normalScale: new THREE.Vector2(0.16, 0.16),
      roughnessMap: roverMetal.roughnessMap,
      metalnessMap: roverMetal.metalnessMap,
      roughness: 0.4,
      metalness: 0.46
    }),
    trim: new THREE.MeshStandardMaterial({
      color: 0x344d5a,
      map: roverTrim.map,
      normalMap: roverTrim.normalMap,
      normalScale: new THREE.Vector2(0.14, 0.14),
      roughnessMap: roverTrim.roughnessMap,
      metalnessMap: roverTrim.metalnessMap,
      roughness: 0.46,
      metalness: 0.56
    }),
    accent: new THREE.MeshStandardMaterial({
      color: COLORS.amber,
      map: roverMetal.map,
      roughness: 0.32,
      metalness: 0.46
    }),
    claw: new THREE.MeshStandardMaterial({
      color: COLORS.roverDark,
      map: rock.map,
      normalMap: rock.normalMap,
      normalScale: new THREE.Vector2(0.2, 0.2),
      roughnessMap: rock.roughnessMap,
      roughness: 0.56,
      metalness: 0.36
    })
  };
}
