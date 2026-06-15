import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { COLORS } from '../config/constants.js';
import { InputController } from '../interaction/InputController.js';
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
      container.clientWidth / container.clientHeight
    );

    this.iceCave = new IceCave();
    this.rover = new Rover();
    this.input = new InputController({
      onToggleHeadlights: () => this.rover.toggleHeadlights(),
      onReset: () => this.resetRover(),
      onToggleCollisionDebug: () => this.iceCave.collisionSystem.toggleDebug()
    });

    this.scene.add(createLights());
    this.scene.add(this.iceCave.group);
    this.scene.add(this.rover.root);

    this.cameraManager.snapTo(this.rover);

    this.onResize = this.onResize.bind(this);
    this.update = this.update.bind(this);
    window.addEventListener('resize', this.onResize);
  }

  start() {
    this.renderer.setAnimationLoop(this.update);
  }

  update(time) {
    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.rover.update(delta, this.input.getMovement(), this.iceCave.collisionSystem);
    this.iceCave.update(delta);
    this.cameraManager.update(this.rover, delta);

    TWEEN.update(time);
    this.renderer.render(this.scene, this.cameraManager.camera);
  }

  resetRover() {
    this.rover.reset();
    this.cameraManager.snapTo(this.rover);
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.renderer.resize(width, height);
    this.cameraManager.resize(width / height);
  }
}
