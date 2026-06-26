import * as THREE from 'three';
import { COLORS } from '../config/constants.js';

export function createLights() {
  const group = new THREE.Group();
  group.name = 'CaveLights';

  const hemisphere = new THREE.HemisphereLight(0xc1f1ff, 0x061725, 0.82);
  group.add(hemisphere);

  const ambient = new THREE.AmbientLight(0x79b8d1, 0.16);
  group.add(ambient);

  const key = new THREE.DirectionalLight(COLORS.snow, 1.38);
  key.name = 'HighIceShaft';
  key.position.set(-12, 26, -12);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 90;
  key.shadow.camera.left = -36;
  key.shadow.camera.right = 36;
  key.shadow.camera.top = 36;
  key.shadow.camera.bottom = -36;
  key.shadow.normalBias = 0.03;
  group.add(key);

  const startFill = new THREE.PointLight(COLORS.crystalBlue, 1.16, 46, 1.9);
  startFill.name = 'StartAreaFill';
  startFill.position.set(-5, 5, 12);
  group.add(startFill);

  const chamberFill = new THREE.PointLight(COLORS.crystalCyan, 1.52, 74, 1.8);
  chamberFill.name = 'ChamberCrystalFill';
  chamberFill.position.set(11, 7, -126);
  group.add(chamberFill);

  const corridorBounce = new THREE.PointLight(0x76c8e6, 0.66, 34, 2);
  corridorBounce.name = 'CorridorIceBounce';
  corridorBounce.position.set(-4, 4.5, -62);
  group.add(corridorBounce);

  const deepCaveBounce = new THREE.PointLight(0x5eb5d5, 0.8, 44, 2);
  deepCaveBounce.name = 'DeepCaveIceBounce';
  deepCaveBounce.position.set(-7, 6, -177);
  group.add(deepCaveBounce);

  return group;
}
