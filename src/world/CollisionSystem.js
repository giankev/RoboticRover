import * as THREE from 'three';

export class CollisionSystem {
  constructor({ minZ, maxZ, getHalfWidth, roverHalfSize, boundaryPadding = 0.75 }) {
    this.minZ = minZ;
    this.maxZ = maxZ;
    this.getHalfWidth = getHalfWidth;
    this.roverHalfSize = roverHalfSize.clone();
    this.boundaryPadding = boundaryPadding;
    this.colliders = [];
    this.roverBox = new THREE.Box3();
    this.debugGroup = new THREE.Group();
    this.debugGroup.name = 'CollisionDebug';
    this.debugGroup.visible = false;
  }

  addObjectCollider(object, name, expansion = 0.35) {
    object.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) {
      return;
    }

    box.expandByVector(new THREE.Vector3(expansion, 0.12, expansion));
    this.addColliderBox(box, name);
  }

  addBoxCollider({ name, center, size }) {
    const halfSize = size.clone().multiplyScalar(0.5);
    const box = new THREE.Box3(
      center.clone().sub(halfSize),
      center.clone().add(halfSize)
    );

    this.addColliderBox(box, name);
  }

  addColliderBox(box, name = 'Collider') {
    const collider = { name, box };
    this.colliders.push(collider);

    const helper = new THREE.Box3Helper(box, 0xffd166);
    helper.name = `${name}Helper`;
    helper.visible = true;
    this.debugGroup.add(helper);
    return collider;
  }

  toggleDebug() {
    this.debugGroup.visible = !this.debugGroup.visible;
    return this.debugGroup.visible;
  }

  isPositionValid(position) {
    if (!this.isInsideCaveBounds(position)) {
      return false;
    }

    const roverBox = this.getRoverBox(position);
    return !this.colliders.some((collider) => roverBox.intersectsBox(collider.box));
  }

  getRoverBox(position) {
    this.roverBox.min.set(
      position.x - this.roverHalfSize.x,
      position.y,
      position.z - this.roverHalfSize.z
    );
    this.roverBox.max.set(
      position.x + this.roverHalfSize.x,
      position.y + this.roverHalfSize.y,
      position.z + this.roverHalfSize.z
    );

    return this.roverBox;
  }

  isInsideCaveBounds(position) {
    if (
      position.z < this.minZ + this.boundaryPadding ||
      position.z > this.maxZ - this.boundaryPadding
    ) {
      return false;
    }

    const halfWidth = this.getHalfWidth(position.z);
    const allowedX = halfWidth - this.roverHalfSize.x - this.boundaryPadding;
    return Math.abs(position.x) <= allowedX;
  }
}
