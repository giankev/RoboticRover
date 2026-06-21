import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { COLORS, SCANNER } from '../config/constants.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

export class ScannerSystem {
  constructor({ rover, targets }) {
    this.rover = rover;
    this.targets = targets;
    this.group = new THREE.Group();
    this.group.name = 'ScannerSystem';

    this.isScanning = false;
    this.statusLabel = 'Ready';
    this.activeTarget = null;
    this.effectState = {
      beamOpacity: 0,
      ringOpacity: 0,
      ringScale: 0.2,
      targetBoost: 0
    };

    this.origin = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    this.midpoint = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    this.buildEffects();
  }

  buildEffects() {
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.14, 1, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: COLORS.scanner,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })
    );
    this.beam.name = 'ScannerBeam';
    this.beam.visible = false;

    this.pulseRing = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.035, 8, 72),
      new THREE.MeshBasicMaterial({
        color: COLORS.scanner,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending
      })
    );
    this.pulseRing.name = 'ScannerPulseRing';
    this.pulseRing.rotation.x = Math.PI / 2;
    this.pulseRing.visible = false;

    this.group.add(this.beam, this.pulseRing);
  }

  activate() {
    if (this.isScanning) {
      return;
    }

    const nearest = this.findNearestUnscannedTarget();

    if (!nearest) {
      this.playFailure('All targets scanned');
      return;
    }

    if (nearest.distance > SCANNER.range) {
      this.playFailure('Move closer to scan');
      return;
    }

    this.playSuccessfulScan(nearest.target);
  }

  update() {
    if (!this.activeTarget) {
      return;
    }

    this.positionEffects(this.activeTarget);
    this.applyEffectState(this.activeTarget);
  }

  async playSuccessfulScan(target) {
    this.isScanning = true;
    this.activeTarget = target;
    this.statusLabel = 'Scanning';
    this.setTargetState(target, 'scanning');

    this.effectState.beamOpacity = 0;
    this.effectState.ringOpacity = 0;
    this.effectState.ringScale = 0.2;
    this.effectState.targetBoost = 0;

    this.beam.visible = true;
    this.pulseRing.visible = true;
    this.positionEffects(target);

    this.rover.animateScannerFocus(
      this.getTargetPosition(target, this.targetPosition),
      SCANNER.focusDuration
    );

    await Promise.all([
      this.tweenEffect(
        {
          beamOpacity: 0.14,
          ringOpacity: 0.58,
          ringScale: 2.45,
          targetBoost: 1.7
        },
        SCANNER.scanDuration,
        TWEEN.Easing.Cubic.InOut
      ),
      this.tweenScanRing(SCANNER.scanDuration)
    ]);

    this.setTargetState(target, 'scanned');
    this.statusLabel = 'Target scanned';
    this.hideEffects();
    this.activeTarget = null;
    await this.rover.resetScannerFocus(420);
    this.isScanning = false;
  }

  async playFailure(message) {
    this.isScanning = true;
    this.statusLabel = message;
    await this.rover.playScannerFailure(SCANNER.failureDuration);
    this.isScanning = false;
  }

  findNearestUnscannedTarget() {
    let nearest = null;
    const roverPosition = this.rover.root.position;

    for (const target of this.targets) {
      if (target.scanState === 'scanned') {
        continue;
      }

      const position = this.getTargetPosition(target, this.targetPosition);
      const distance = roverPosition.distanceTo(position);

      if (!nearest || distance < nearest.distance) {
        nearest = { target, distance };
      }
    }

    return nearest;
  }

  setTargetState(target, state) {
    target.scanState = state;
    target.mesh.userData.scanState = state;

    if (state === 'scanned') {
      target.material.color.setHex(COLORS.scannerScanned);
      target.material.emissive.setHex(COLORS.scannerScanned);
      target.light.color.setHex(COLORS.scannerScanned);
      target.scanBoost = 0.7;

      if (target.scanMarker) {
        target.scanMarker.material.color.setHex(COLORS.scannerScanned);
      }

      return;
    }

    if (state === 'scanning' && target.scanMarker) {
      target.scanMarker.material.color.setHex(COLORS.scanner);
    }
  }

  tweenEffect(targetState, duration, easing) {
    return new Promise((resolve) => {
      new TWEEN.Tween(this.effectState, true)
        .to(targetState, duration)
        .easing(easing)
        .onUpdate(() => {
          if (this.activeTarget) {
            this.applyEffectState(this.activeTarget);
          }
        })
        .onComplete(resolve)
        .start();
    });
  }

  tweenScanRing(duration) {
    const ringState = { scale: 0.2, opacity: 0.5 };

    return new Promise((resolve) => {
      new TWEEN.Tween(ringState, true)
        .to({ scale: 2.7, opacity: 0 }, duration)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(() => {
          this.effectState.ringScale = ringState.scale;
          this.effectState.ringOpacity = ringState.opacity;
        })
        .onComplete(resolve)
        .start();
    });
  }

  applyEffectState(target) {
    this.beam.material.opacity = this.effectState.beamOpacity;
    this.pulseRing.material.opacity = this.effectState.ringOpacity;
    this.pulseRing.scale.setScalar(this.effectState.ringScale);
    target.scanBoost = this.effectState.targetBoost;
  }

  positionEffects(target) {
    this.rover.getScannerOrigin(this.origin);
    this.getTargetPosition(target, this.targetPosition);

    this.direction.copy(this.targetPosition).sub(this.origin);
    const distance = this.direction.length();

    if (distance <= 0.001) {
      return;
    }

    this.midpoint.copy(this.origin).addScaledVector(this.direction, 0.5);
    this.beam.position.copy(this.midpoint);
    this.beam.scale.set(1, distance, 1);
    this.beam.quaternion.setFromUnitVectors(Y_AXIS, this.direction.normalize());

    this.pulseRing.position.set(this.targetPosition.x, 0.24, this.targetPosition.z);
    this.pulseRing.rotation.z += 0.035;
  }

  getTargetPosition(target, destination) {
    target.mesh.getWorldPosition(destination);
    return destination;
  }

  hideEffects() {
    if (this.activeTarget) {
      this.activeTarget.scanBoost = 0;
    }

    this.beam.visible = false;
    this.pulseRing.visible = false;
    this.beam.material.opacity = 0;
    this.pulseRing.material.opacity = 0;
    this.effectState.beamOpacity = 0;
    this.effectState.ringOpacity = 0;
    this.effectState.targetBoost = 0;
  }
}
