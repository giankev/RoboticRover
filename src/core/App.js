import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { COLORS } from '../config/constants.js';
import { InputController } from '../interaction/InputController.js';
import { ScannerSystem } from '../interaction/ScannerSystem.js';
import { Rover } from '../rover/Rover.js';
import { IceCave } from '../world/IceCave.js';
import { createLights } from '../world/Lights.js';
import { CameraManager } from './CameraManager.js';
import { Renderer } from './Renderer.js';

export class App {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.background);
    this.scene.fog = new THREE.Fog(COLORS.background, 24, 205);

    this.renderer = new Renderer(container);
    this.cameraManager = new CameraManager(
      container.clientWidth / container.clientHeight,
      this.renderer.domElement
    );

    this.iceCave = new IceCave();
    this.rover = new Rover();
    this.scanner = new ScannerSystem({
      rover: this.rover,
      targets: this.iceCave.scannableTargets
    });
    this.input = new InputController({
      onToggleHeadlights: () => this.rover.toggleHeadlights(),
      onReset: () => this.resetRover(),
      onToggleCollisionDebug: () => this.iceCave.collisionSystem.toggleDebug(),
      onCycleCamera: () => this.cycleCameraMode(),
      onScan: () => this.scanner.activate(),
      onArmIdle: () => this.rover.setArmIdle(),
      onArmReady: () => this.rover.setArmReady(),
      onArmReach: () => this.rover.setArmReach(),
      onToggleGripper: () => this.rover.toggleGripper(),
      onArmInspection: () => this.rover.playArmInspectionSequence()
    });

    this.scene.add(createLights());
    this.scene.add(this.iceCave.group);
    this.scene.add(this.rover.root);
    this.scene.add(this.scanner.group);

    this.cameraManager.snapTo(this.rover);
    this.statusLines = this.createStatusOverlay();
    this.updateStatusOverlay();

    this.onResize = this.onResize.bind(this);
    this.update = this.update.bind(this);
    window.addEventListener('resize', this.onResize);
  }

  start() {
    this.renderer.setAnimationLoop(this.update);
  }

  update(time) {
    const delta = Math.min(this.clock.getDelta(), 0.05);

    const movement = this.scanner.isScanning
      ? { throttle: 0, turn: 0 }
      : this.input.getMovement();

    this.rover.update(delta, movement, this.iceCave.collisionSystem);
    this.iceCave.update(delta);
    TWEEN.update(time);
    this.scanner.update(delta);
    this.cameraManager.update(this.rover, delta);
    this.updateStatusOverlay();

    this.renderer.render(this.scene, this.cameraManager.camera);
  }

  resetRover() {
    this.rover.reset();
    this.cameraManager.snapTo(this.rover);
  }

  cycleCameraMode() {
    this.cameraManager.cycleMode(this.rover);
    this.updateStatusOverlay();
  }

  createStatusOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'status-overlay';

    const cameraLine = document.createElement('div');
    const armLine = document.createElement('div');
    const scannerLine = document.createElement('div');

    overlay.append(cameraLine, armLine, scannerLine);
    this.container.appendChild(overlay);

    return { cameraLine, armLine, scannerLine };
  }

  updateStatusOverlay() {
    if (!this.statusLines) {
      return;
    }

    this.statusLines.cameraLine.textContent = `Camera: ${this.cameraManager.modeLabel}`;
    this.statusLines.armLine.textContent = `Arm: ${this.rover.arm.status}`;
    this.statusLines.scannerLine.textContent = `Scanner: ${this.scanner.statusLabel}`;
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.renderer.resize(width, height);
    this.cameraManager.resize(width / height);
  }
}
