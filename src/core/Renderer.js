import * as THREE from 'three';
import { configureProceduralTextureAnisotropy } from '../world/ProceduralTextures.js';

export class Renderer {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });

    this.pixelRatioLimit = 1.75;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.pixelRatioLimit));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    configureProceduralTextureAnisotropy(this.renderer.capabilities.getMaxAnisotropy());

    container.appendChild(this.renderer.domElement);
  }

  get domElement() {
    return this.renderer.domElement;
  }

  setAnimationLoop(callback) {
    this.renderer.setAnimationLoop(callback);
  }

  resize(width, height) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.pixelRatioLimit));
    this.renderer.setSize(width, height);
  }

  render(scene, camera) {
    this.renderer.render(scene, camera);
  }
}
