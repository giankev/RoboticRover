import * as THREE from 'three';
import { CAMERA } from '../config/constants.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

export class CameraManager {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(
      CAMERA.fov,
      aspect,
      CAMERA.near,
      CAMERA.far
    );

    this.targetPosition = new THREE.Vector3();
    this.lookAtTarget = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(rover, delta) {
    this.getFollowPosition(rover, this.targetPosition);
    this.getLookAtPosition(rover, this.lookAtTarget);

    const followBlend = this.getFrameBlend(CAMERA.followLerp, delta);
    const lookBlend = this.getFrameBlend(CAMERA.lookAtLerp, delta);

    this.camera.position.lerp(this.targetPosition, followBlend);
    this.currentLookAt.lerp(this.lookAtTarget, lookBlend);
    this.camera.lookAt(this.currentLookAt);
  }

  snapTo(rover) {
    this.getFollowPosition(rover, this.targetPosition);
    this.getLookAtPosition(rover, this.lookAtTarget);
    this.camera.position.copy(this.targetPosition);
    this.currentLookAt.copy(this.lookAtTarget);
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
