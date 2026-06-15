import * as THREE from 'three';
import { COLORS } from '../config/constants.js';

export function createLights() {
  const group = new THREE.Group();
  group.name = 'CaveLights';

  const hemisphere = new THREE.HemisphereLight(0xa5e2ff, 0x07121d, 0.82);
  group.add(hemisphere);

  const ambient = new THREE.AmbientLight(0x91bad2, 0.28);
  group.add(ambient);

  const key = new THREE.DirectionalLight(COLORS.snow, 1.65);
  key.name = 'HighIceShaft';
  key.position.set(-12, 26, -12);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 90;
  key.shadow.camera.left = -36;
  key.shadow.camera.right = 36;
  key.shadow.camera.top = 36;
  key.shadow.camera.bottom = -36;
  group.add(key);

  const startFill = new THREE.PointLight(COLORS.crystalBlue, 1.15, 42, 1.8);
  startFill.name = 'StartAreaFill';
  startFill.position.set(-5, 5, 12);
  group.add(startFill);

  const chamberFill = new THREE.PointLight(COLORS.crystalCyan, 1.55, 68, 1.7);
  chamberFill.name = 'ChamberCrystalFill';
  chamberFill.position.set(11, 7, -126);
  group.add(chamberFill);

  return group;
}
