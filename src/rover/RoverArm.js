import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { COLORS } from '../config/constants.js';

const ARM = {
  upperLength: 1.08,
  forearmLength: 0.92,
  gripperReach: 0.34
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
  }
};

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
    this.gripper.add(this.leftClaw, this.rightClaw);
  }

  setIdlePose() {
    this.stopActiveTween();
    this.sequenceToken += 1;
    this.status = 'Idle';
    this.gripperOpen = false;
    Object.assign(this.poseState, ARM_POSES.idle);
    this.applyPoseState();
  }

  animateToIdle() {
    this.sequenceToken += 1;
    this.status = 'Idle';
    this.gripperOpen = false;
    return this.tweenToState(ARM_POSES.idle, 900);
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

  openGripper() {
    this.sequenceToken += 1;
    if (this.status === 'Inspecting') {
      this.status = 'Ready';
    }
    this.gripperOpen = true;
    return this.tweenToState({ gripper: 1 }, 300, TWEEN.Easing.Cubic.Out);
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
  return {
    arm: new THREE.MeshStandardMaterial({
      color: COLORS.roverBody,
      roughness: 0.52,
      metalness: 0.18
    }),
    trim: new THREE.MeshStandardMaterial({
      color: COLORS.roverTrim,
      roughness: 0.6,
      metalness: 0.2
    }),
    accent: new THREE.MeshStandardMaterial({
      color: COLORS.amber,
      roughness: 0.46,
      metalness: 0.24
    }),
    claw: new THREE.MeshStandardMaterial({
      color: COLORS.roverDark,
      roughness: 0.5,
      metalness: 0.32
    })
  };
}
