import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CAMERA } from '../config/constants.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const CAMERA_MODES = ['Follow', 'Orbit', 'Arm'];
const ORBIT_OFFSET = new THREE.Vector3(0, 5.2, 9.2);
const ORBIT_TARGET_OFFSET = new THREE.Vector3(0, 1.35, -0.6);
const ARM_CAMERA_OFFSET = new THREE.Vector3(3.2, 2.45, 2.65);
const ARM_FALLBACK_LOOK_OFFSET = new THREE.Vector3(0.8, 1.9, -0.5);

export class CameraManager {
  constructor(aspect, domElement) {
    this.camera = new THREE.PerspectiveCamera(
      CAMERA.fov,
      aspect,
      CAMERA.near,
      CAMERA.far
    );

    this.targetPosition = new THREE.Vector3();
    this.lookAtTarget = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
    this.orbitTarget = new THREE.Vector3();
    this.targetDelta = new THREE.Vector3();
    this.tempPosition = new THREE.Vector3();
    this.tempLookAt = new THREE.Vector3();
    this.tempArmPoint = new THREE.Vector3();

    this.modeIndex = 0;
    this.mode = CAMERA_MODES[this.modeIndex];

    this.orbitControls = new OrbitControls(this.camera, domElement);
    this.orbitControls.enabled = false;
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.08;
    this.orbitControls.enablePan = false;
    this.orbitControls.minDistance = 3.2;
    this.orbitControls.maxDistance = 22;
    this.orbitControls.maxPolarAngle = Math.PI * 0.48;
  }

  get modeLabel() {
    return this.mode;
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(rover, delta) {
    if (this.mode === 'Orbit') {
      this.updateOrbitCamera(rover, delta);
      return;
    }

    if (this.mode === 'Arm') {
      this.updateArmCamera(rover, delta);
      return;
    }

    this.getFollowPosition(rover, this.targetPosition);
    this.getLookAtPosition(rover, this.lookAtTarget);

    const followBlend = this.getFrameBlend(CAMERA.followLerp, delta);
    const lookBlend = this.getFrameBlend(CAMERA.lookAtLerp, delta);

    this.camera.position.lerp(this.targetPosition, followBlend);
    this.currentLookAt.lerp(this.lookAtTarget, lookBlend);
    this.camera.lookAt(this.currentLookAt);
  }

  cycleMode(rover) {
    this.modeIndex = (this.modeIndex + 1) % CAMERA_MODES.length;
    this.mode = CAMERA_MODES[this.modeIndex];
    this.orbitControls.enabled = this.mode === 'Orbit';
    this.snapTo(rover);
    return this.mode;
  }

  snapTo(rover) {
    if (this.mode === 'Orbit') {
      this.getOrbitPosition(rover, this.targetPosition);
      this.getOrbitTarget(rover, this.orbitTarget);
      this.camera.position.copy(this.targetPosition);
      this.orbitControls.target.copy(this.orbitTarget);
      this.currentLookAt.copy(this.orbitTarget);
      this.orbitControls.update();
      return;
    }

    if (this.mode === 'Arm') {
      this.getArmCameraPosition(rover, this.targetPosition);
      this.getArmLookAtPosition(rover, this.lookAtTarget);
      this.camera.position.copy(this.targetPosition);
      this.currentLookAt.copy(this.lookAtTarget);
      this.camera.lookAt(this.currentLookAt);
      return;
    }

    this.getFollowPosition(rover, this.targetPosition);
    this.getLookAtPosition(rover, this.lookAtTarget);
    this.camera.position.copy(this.targetPosition);
    this.currentLookAt.copy(this.lookAtTarget);
    this.camera.lookAt(this.currentLookAt);
  }

  updateOrbitCamera(rover, delta) {
    this.getOrbitTarget(rover, this.lookAtTarget);

    const blend = this.getFrameBlend(CAMERA.lookAtLerp, delta);
    this.orbitTarget.lerp(this.lookAtTarget, blend);
    this.targetDelta.copy(this.orbitTarget).sub(this.orbitControls.target);
    this.camera.position.add(this.targetDelta);
    this.orbitControls.target.copy(this.orbitTarget);
    this.currentLookAt.copy(this.orbitTarget);
    this.orbitControls.update();
  }

  updateArmCamera(rover, delta) {
    this.getArmCameraPosition(rover, this.targetPosition);
    this.getArmLookAtPosition(rover, this.lookAtTarget);

    const followBlend = this.getFrameBlend(0.1, delta);
    const lookBlend = this.getFrameBlend(0.18, delta);

    this.camera.position.lerp(this.targetPosition, followBlend);
    this.currentLookAt.lerp(this.lookAtTarget, lookBlend);
    this.camera.lookAt(this.currentLookAt);
  }

  getFollowPosition(rover, target) {
    const root = rover.root;
    const offset = new THREE.Vector3(
      CAMERA.followOffset.x,
      CAMERA.followOffset.y,
      CAMERA.followOffset.z
    );

    offset.applyAxisAngle(Y_AXIS, root.rotation.y);
    target.copy(root.position).add(offset);
    return target;
  }

  getOrbitPosition(rover, target) {
    this.tempPosition.copy(ORBIT_OFFSET);
    this.tempPosition.applyAxisAngle(Y_AXIS, rover.root.rotation.y);
    target.copy(rover.root.position).add(this.tempPosition);
    return target;
  }

  getOrbitTarget(rover, target) {
    this.tempLookAt.copy(ORBIT_TARGET_OFFSET);
    this.tempLookAt.applyAxisAngle(Y_AXIS, rover.root.rotation.y);
    target.copy(rover.root.position).add(this.tempLookAt);
    return target;
  }

  getArmCameraPosition(rover, target) {
    this.tempPosition.copy(ARM_CAMERA_OFFSET);
    this.tempPosition.applyAxisAngle(Y_AXIS, rover.root.rotation.y);
    target.copy(rover.root.position).add(this.tempPosition);
    return target;
  }

  getArmLookAtPosition(rover, target) {
    if (rover.arm?.gripper && rover.arm?.shoulder) {
      rover.arm.gripper.getWorldPosition(target);
      rover.arm.shoulder.getWorldPosition(this.tempArmPoint);
      target.lerp(this.tempArmPoint, 0.22);
      target.y += 0.08;
      return target;
    }

    this.tempLookAt.copy(ARM_FALLBACK_LOOK_OFFSET);
    this.tempLookAt.applyAxisAngle(Y_AXIS, rover.root.rotation.y);
    target.copy(rover.root.position).add(this.tempLookAt);
    return target;
  }

  getLookAtPosition(rover, target) {
    const root = rover.root;
    const offset = new THREE.Vector3(
      CAMERA.lookAtOffset.x,
      CAMERA.lookAtOffset.y,
      CAMERA.lookAtOffset.z
    );

    offset.applyAxisAngle(Y_AXIS, root.rotation.y);
    target.copy(root.position).add(offset);
    return target;
  }

  getFrameBlend(baseLerp, delta) {
    return 1 - Math.pow(1 - baseLerp, delta * 60);
  }
}
