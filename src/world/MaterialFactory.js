import * as THREE from 'three';
import { COLORS } from '../config/constants.js';

/**
 * Shared PBR materials for the procedural cave. The texture slots intentionally
 * mirror conventional imported-texture workflows, so CC0 image assets can later
 * replace the generated CanvasTexture maps without changing scene geometry.
 */
export function createCaveMaterials(textures) {
  const { caveIce, ground, rock } = textures;

  return {
    ground: new THREE.MeshPhysicalMaterial({
      color: 0xc3edf0,
      map: ground.map,
      normalMap: ground.normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughnessMap: ground.roughnessMap,
      metalnessMap: ground.metalnessMap,
      roughness: 0.68,
      metalness: 0.02,
      clearcoat: 0.18,
      clearcoatRoughness: 0.62
    }),
    iceSheet: new THREE.MeshPhysicalMaterial({
      color: 0xb8edf1,
      map: caveIce.map,
      normalMap: caveIce.normalMap,
      normalScale: new THREE.Vector2(0.18, 0.18),
      roughnessMap: caveIce.roughnessMap,
      roughness: 0.28,
      metalness: 0.02,
      clearcoat: 0.52,
      clearcoatRoughness: 0.22,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    frozenPuddle: new THREE.MeshPhysicalMaterial({
      color: 0x82d1df,
      map: caveIce.map,
      normalMap: caveIce.normalMap,
      normalScale: new THREE.Vector2(0.12, 0.12),
      roughness: 0.08,
      metalness: 0.04,
      reflectivity: 0.68,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      side: THREE.DoubleSide
    }),
    path: new THREE.MeshStandardMaterial({
      color: COLORS.compactSnow,
      map: ground.map,
      normalMap: ground.normalMap,
      normalScale: new THREE.Vector2(0.18, 0.18),
      roughnessMap: ground.roughnessMap,
      emissive: 0x173d4a,
      emissiveIntensity: 0.18,
      roughness: 0.72,
      metalness: 0.02,
      transparent: true,
      opacity: 0.58
    }),
    wall: new THREE.MeshStandardMaterial({
      color: 0x7bb3c4,
      map: caveIce.map,
      normalMap: caveIce.normalMap,
      normalScale: new THREE.Vector2(0.48, 0.48),
      roughnessMap: caveIce.roughnessMap,
      metalnessMap: caveIce.metalnessMap,
      roughness: 0.74,
      metalness: 0.02,
      side: THREE.DoubleSide
    }),
    ceiling: new THREE.MeshStandardMaterial({
      color: 0x4d8399,
      map: caveIce.map,
      normalMap: caveIce.normalMap,
      normalScale: new THREE.Vector2(0.38, 0.38),
      roughnessMap: caveIce.roughnessMap,
      roughness: 0.62,
      metalness: 0.03,
      side: THREE.DoubleSide
    }),
    formation: new THREE.MeshPhysicalMaterial({
      color: 0xb7e8f2,
      map: caveIce.map,
      normalMap: caveIce.normalMap,
      normalScale: new THREE.Vector2(0.24, 0.24),
      roughnessMap: caveIce.roughnessMap,
      roughness: 0.4,
      metalness: 0.04,
      clearcoat: 0.38,
      clearcoatRoughness: 0.36
    }),
    darkFormation: new THREE.MeshStandardMaterial({
      color: 0x526d7a,
      map: rock.map,
      normalMap: rock.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: rock.roughnessMap,
      roughness: 0.9,
      metalness: 0.03
    }),
    marker: new THREE.MeshStandardMaterial({
      color: COLORS.amber,
      emissive: COLORS.amber,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0.06,
      transparent: true,
      opacity: 0.64
    }),
    scannerMarker: new THREE.MeshBasicMaterial({
      color: COLORS.scanner,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  };
}
