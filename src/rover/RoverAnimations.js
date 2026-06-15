import * as THREE from 'three';
import { ROVER } from '../config/constants.js';

export class RoverAnimations {
  constructor(parts) {
    this.parts = parts;
    this.time = 0;
    this.bodyBaseY = parts.body.position.y;
    this.bodyBaseRotation = parts.body.rotation.clone();
  }

  update(delta, signedSpeed, turnAmount) {
    this.time += delta;

    const moving = Math.abs(signedSpeed) > 0.01 || Math.abs(turnAmount) > 0.01;
    const wheelDirection = signedSpeed === 0 ? Math.sign(turnAmount) : Math.sign(signedSpeed);
    const wheelMotion = Math.abs(signedSpeed) + Math.abs(turnAmount) * ROVER.moveSpeed * 0.36;
    const wheelStep = (wheelMotion * delta * wheelDirection) / ROVER.wheelRadius;

    for (const wheel of this.parts.wheels) {
      wheel.rotation.x += wheelStep;
    }

    if (moving) {
      this.parts.body.position.y =
        this.bodyBaseY + Math.sin(this.time * 9.4) * 0.035;
      this.parts.body.rotation.x =
        this.bodyBaseRotation.x + Math.sin(this.time * 8.6) * 0.012;
      this.parts.body.rotation.z =
        this.bodyBaseRotation.z + Math.cos(this.time * 7.3) * 0.014;
    } else {
      this.parts.body.position.y = THREE.MathUtils.lerp(
        this.parts.body.position.y,
        this.bodyBaseY,
        0.08
      );
      this.parts.body.rotation.x = THREE.MathUtils.lerp(
        this.parts.body.rotation.x,
        this.bodyBaseRotation.x,
        0.08
      );
      this.parts.body.rotation.z = THREE.MathUtils.lerp(
        this.parts.body.rotation.z,
        this.bodyBaseRotation.z,
        0.08
      );

      this.parts.cameraMast.rotation.y = Math.sin(this.time * 1.05) * 0.075;
      this.parts.cameraMast.rotation.x = Math.sin(this.time * 0.78) * 0.025;
    }

    if (moving) {
      this.parts.cameraMast.rotation.y = THREE.MathUtils.lerp(
        this.parts.cameraMast.rotation.y,
        0,
        0.1
      );
      this.parts.cameraMast.rotation.x = THREE.MathUtils.lerp(
        this.parts.cameraMast.rotation.x,
        0,
        0.1
      );
    }

    this.parts.antennaBase.rotation.z = Math.sin(this.time * 2.1) * 0.055;
    this.parts.antennaDish.rotation.y = Math.sin(this.time * 1.4) * 0.12;
  }
}
