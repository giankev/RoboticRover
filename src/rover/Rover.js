import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { COLORS, ROVER } from '../config/constants.js';
import { RoverAnimations } from './RoverAnimations.js';
import { RoverArm, createArmMaterials } from './RoverArm.js';

const FORWARD = new THREE.Vector3(0, 0, -1);
const SCANNER_TARGET_LOCAL = new THREE.Vector3();
const SCANNER_DIRECTION = new THREE.Vector3();

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
    this.scannerActive = false;
    this.scannerFocusTween = null;
    this.scannerFailureTween = null;
    this.wheels = [];
    this.headlights = [];
    this.headlightCones = [];
    this.moveDirection = new THREE.Vector3();
    this.moveStep = new THREE.Vector3();
    this.candidatePosition = new THREE.Vector3();

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

  getScannerOrigin(target = new THREE.Vector3()) {
    this.cameraLens.getWorldPosition(target);
    return target;
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

  playScannerFailure(duration = 720) {
    this.setScannerActive(true);

    if (this.scannerFailureTween) {
      this.scannerFailureTween.stop();
    }

    const state = { progress: 0 };
    const indicator = this.scannerIndicator.material;

    return new Promise((resolve) => {
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
          this.setScannerActive(false);
          resolve();
        })
        .start();
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
    this.headlightsEnabled = !this.headlightsEnabled;
    this.headlightTargetIntensity = this.headlightsEnabled ? ROVER.headlightIntensity : 0;

    if (this.headlightsEnabled) {
      this.setHeadlightVisibility(true);
    } else {
      this.headlightCurrentIntensity = 0;
      this.applyHeadlightState(0);
    }
  }

  updateHeadlights(delta) {
    if (this.headlightCurrentIntensity === this.headlightTargetIntensity) {
      return;
    }

    const blend = Math.min(1, delta * this.headlightFadeSpeed);
    this.headlightCurrentIntensity = THREE.MathUtils.lerp(
      this.headlightCurrentIntensity,
      this.headlightTargetIntensity,
      blend
    );

    if (Math.abs(this.headlightCurrentIntensity - this.headlightTargetIntensity) < 1) {
      this.headlightCurrentIntensity = this.headlightTargetIntensity;
    }

    this.applyHeadlightState(this.headlightCurrentIntensity);
  }

  applyHeadlightState(intensity) {
    const ratio = THREE.MathUtils.clamp(intensity / ROVER.headlightIntensity, 0, 1);
    const isVisible = this.headlightsEnabled && ratio > 0.02;

    for (const light of this.headlights) {
      light.intensity = intensity;
      light.visible = isVisible;
    }

    for (const lens of this.headlightLenses) {
      lens.material.emissiveIntensity = ratio * 8.5;
      lens.material.emissive.setHex(isVisible ? COLORS.headlight : 0x000000);
      lens.material.color.setHex(isVisible ? COLORS.headlight : 0x1a242d);
    }

    for (const cone of this.headlightCones) {
      cone.visible = isVisible;
      cone.material.opacity = ratio * 0.09;
    }
  }

  setHeadlightVisibility(visible) {
    for (const light of this.headlights) {
      light.visible = visible;
    }

    for (const cone of this.headlightCones) {
      cone.visible = visible;
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

    this.root.add(
      this.body,
      this.wheelsGroup,
      this.cameraMast,
      this.antennaBase,
      this.headlightsGroup,
      this.sampleContainer,
      this.arm.root
    );
  }

  createBody() {
    const body = new THREE.Group();
    body.name = 'Body';
    body.position.y = 0.86;

    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(2.15, 0.58, 1.42),
      this.materials.body
    );
    chassis.name = 'MainChassis';
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    body.add(chassis);

    const topDeck = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.28, 1.04),
      this.materials.panel
    );
    topDeck.name = 'UpperDeck';
    topDeck.position.set(0, 0.42, -0.02);
    topDeck.castShadow = true;
    topDeck.receiveShadow = true;
    body.add(topDeck);

    const frontPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.28, 0.22, 0.12),
      this.materials.accent
    );
    frontPlate.name = 'FrontInstrumentPlate';
    frontPlate.position.set(0, 0.04, -0.78);
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
      [-1.05, 0, -0.57],
      [1.05, 0, -0.57],
      [-1.05, 0, 0],
      [1.05, 0, 0],
      [-1.05, 0, 0.57],
      [1.05, 0, 0.57]
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
    cameraMast.position.set(-0.38, 1.2, -0.2);

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
    antennaBase.position.set(0.48, 1.24, 0.28);

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
        0.64,
        1.1
      );
      light.name = `HeadlightBeam_${index + 1}`;
      light.position.set(x, 0.12, -0.08);
      light.visible = false;
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      light.shadow.camera.near = 0.2;
      light.shadow.camera.far = ROVER.headlightDistance;

      const target = new THREE.Object3D();
      target.name = `HeadlightTarget_${index + 1}`;
      target.position.set(x * 0.18, -1.15, -42);
      light.target = target;

      const cone = this.createHeadlightCone(`HeadlightCone_${index + 1}`, x);

      headlights.add(housing, lens, cone, light, target);
      this.headlights.push(light);
      this.headlightLenses.push(lens);
      this.headlightCones.push(cone);
    });

    return headlights;
  }

  createHeadlightCone(name, x) {
    const coneLength = 16;
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, coneLength, 24, 1, true),
      this.materials.headlightCone.clone()
    );

    cone.name = name;
    cone.position.set(x, 0.04, -0.2 - coneLength / 2);
    cone.rotation.x = Math.PI / 2;
    cone.visible = false;
    cone.renderOrder = 2;
    return cone;
  }

  createSampleContainer() {
    const sampleContainer = new THREE.Group();
    sampleContainer.name = 'SampleContainer';
    sampleContainer.position.set(-0.62, 1.18, 0.38);

    const bin = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.36, 0.46),
      this.materials.container
    );
    bin.name = 'SampleContainerBin';
    bin.castShadow = true;
    bin.receiveShadow = true;

    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.08, 0.54),
      this.materials.trim
    );
    rim.name = 'SampleContainerRim';
    rim.position.y = 0.21;
    rim.castShadow = true;
    rim.receiveShadow = true;

    sampleContainer.add(bin, rim);
    return sampleContainer;
  }

  createMaterials() {
    return {
      body: new THREE.MeshStandardMaterial({
        color: COLORS.roverBody,
        roughness: 0.48,
        metalness: 0.2
      }),
      panel: new THREE.MeshStandardMaterial({
        color: 0x9db2bf,
        roughness: 0.42,
        metalness: 0.26
      }),
      trim: new THREE.MeshStandardMaterial({
        color: COLORS.roverTrim,
        roughness: 0.58,
        metalness: 0.28
      }),
      tire: new THREE.MeshStandardMaterial({
        color: COLORS.roverDark,
        roughness: 0.72,
        metalness: 0.08
      }),
      hub: new THREE.MeshStandardMaterial({
        color: COLORS.amber,
        roughness: 0.42,
        metalness: 0.34
      }),
      accent: new THREE.MeshStandardMaterial({
        color: COLORS.amber,
        roughness: 0.44,
        metalness: 0.22
      }),
      container: new THREE.MeshStandardMaterial({
        color: 0x6a8796,
        roughness: 0.54,
        metalness: 0.12
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
      }),
      headlightCone: new THREE.MeshBasicMaterial({
        color: COLORS.headlight,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: true,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending
      })
    };
  }
}
