import * as THREE from 'three';
import { COLORS } from '../config/constants.js';

export class RoverArm {
  constructor(materials) {
    this.materials = materials;
    this.root = new THREE.Group();
    this.root.name = 'RoboticArmBase';
    this.root.position.set(0.86, 1.0, -0.28);

    this.build();
  }

  build() {
    const baseHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.29, 0.22, 16),
      this.materials.trim
    );
    baseHousing.name = 'RoboticArmBaseHousing';
    baseHousing.castShadow = true;
    baseHousing.receiveShadow = true;
    this.root.add(baseHousing);

    const shoulder = this.createJointGroup('Shoulder', 0, 0.16, 0);
    shoulder.rotation.z = -0.5;
    this.root.add(shoulder);

    const upperArm = new THREE.Group();
    upperArm.name = 'UpperArm';
    upperArm.position.y = 0.12;
    shoulder.add(upperArm);
    upperArm.add(this.createLimbMesh('UpperArmLink', 0.72, 0.08));

    const elbow = this.createJointGroup('Elbow', 0, 0.76, 0);
    elbow.rotation.z = 0.72;
    upperArm.add(elbow);

    const forearm = new THREE.Group();
    forearm.name = 'Forearm';
    forearm.position.y = 0.1;
    elbow.add(forearm);
    forearm.add(this.createLimbMesh('ForearmLink', 0.64, 0.07));

    const wrist = this.createJointGroup('Wrist', 0, 0.68, 0);
    wrist.rotation.z = -0.28;
    forearm.add(wrist);

    const gripper = new THREE.Group();
    gripper.name = 'Gripper';
    gripper.position.y = 0.12;
    wrist.add(gripper);

    const palm = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.14, 0.18),
      this.materials.trim
    );
    palm.name = 'GripperPalm';
    palm.castShadow = true;
    palm.receiveShadow = true;
    gripper.add(palm);

    const leftClaw = this.createClaw('LeftClaw', -0.11);
    const rightClaw = this.createClaw('RightClaw', 0.11);
    gripper.add(leftClaw, rightClaw);
  }

  createJointGroup(name, x, y, z) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(x, y, z);

    const joint = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 12),
      this.materials.accent
    );
    joint.name = `${name}Joint`;
    joint.castShadow = true;
    joint.receiveShadow = true;
    group.add(joint);

    return group;
  }

  createLimbMesh(name, length, radius) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.05, length, 12),
      this.materials.arm
    );
    mesh.name = name;
    mesh.position.y = length / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  createClaw(name, x) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(x, 0, 0);
    group.rotation.z = x < 0 ? -0.28 : 0.28;

    const lower = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.28, 0.08),
      this.materials.claw
    );
    lower.name = `${name}LowerSegment`;
    lower.position.y = 0.17;
    lower.castShadow = true;
    lower.receiveShadow = true;

    const tip = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.13, 0.08),
      this.materials.claw
    );
    tip.name = `${name}Tip`;
    tip.position.set(x < 0 ? 0.035 : -0.035, 0.34, 0);
    tip.rotation.z = x < 0 ? 0.5 : -0.5;
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
