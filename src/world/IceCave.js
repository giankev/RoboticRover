import * as THREE from 'three';
import { COLORS, ROVER, WORLD } from '../config/constants.js';
import { CollisionSystem } from './CollisionSystem.js';

export class IceCave {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'IceCave';
    this.time = 0;
    this.crystals = [];
    this.scannableTargets = [];
    this.random = createSeededRandom(17);

    this.collisionSystem = new CollisionSystem({
      minZ: WORLD.caveMinZ,
      maxZ: WORLD.caveMaxZ,
      getHalfWidth: (z) => this.getCaveHalfWidth(z),
      roverHalfSize: new THREE.Vector3(
        ROVER.collisionHalfSize.x,
        ROVER.collisionHalfSize.y,
        ROVER.collisionHalfSize.z
      )
    });
    this.group.add(this.collisionSystem.debugGroup);

    this.materials = this.createMaterials();

    this.createGround();
    this.createPathMarkers();
    this.createWalls();
    this.createIceFormations();
    this.createCrystals();
    this.createSampleArea();
  }

  update(delta) {
    this.time += delta;

    for (const crystal of this.crystals) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 2.4 + crystal.phase);
      const scanBoost = crystal.scanBoost ?? 0;
      const scannedBoost = crystal.scanState === 'scanned' ? 0.9 : 0;
      const scanningBoost = crystal.scanState === 'scanning' ? 0.7 : 0;

      crystal.material.emissiveIntensity =
        0.9 + pulse * 1.8 + scannedBoost + scanningBoost + scanBoost;
      crystal.mesh.scale.copy(crystal.baseScale).multiplyScalar(0.94 + pulse * 0.08);
      crystal.light.intensity = 0.35 + pulse * 0.95 + scannedBoost * 0.45 + scanBoost * 0.38;

      if (crystal.scanMarker) {
        crystal.scanMarker.material.opacity =
          crystal.scanState === 'scanned' ? 0.58 : 0.26 + pulse * 0.2;
        crystal.scanMarker.rotation.z += delta * 0.55;
      }
    }
  }

  getCaveHalfWidth(z) {
    const chamberBlend = smoothstep(-74, -132, z);
    const startBlend = smoothstep(2, 18, z);
    const sampleBulge =
      Math.exp(-Math.pow((z - WORLD.sampleArea.z) / 24, 2)) * 6.5;

    const corridorWidth =
      12.8 + Math.sin(z * 0.09) * 1.1 + Math.sin(z * 0.031) * 0.75;
    const chamberWidth = 34 + Math.sin(z * 0.045) * 3.4 + sampleBulge;
    const startWidth = 22 + Math.sin(z * 0.16) * 1.2;

    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(corridorWidth, startWidth, startBlend),
      chamberWidth,
      chamberBlend
    );
  }

  createMaterials() {
    return {
      ground: new THREE.MeshPhysicalMaterial({
        color: COLORS.ice,
        roughness: 0.42,
        metalness: 0.02,
        clearcoat: 0.38,
        clearcoatRoughness: 0.48
      }),
      path: new THREE.MeshStandardMaterial({
        color: COLORS.compactSnow,
        emissive: 0x173d4a,
        emissiveIntensity: 0.18,
        roughness: 0.58,
        metalness: 0.02,
        transparent: true,
        opacity: 0.58
      }),
      wall: new THREE.MeshStandardMaterial({
        color: COLORS.rockIce,
        roughness: 0.86,
        metalness: 0.02,
        side: THREE.DoubleSide
      }),
      ceiling: new THREE.MeshStandardMaterial({
        color: COLORS.deepIce,
        roughness: 0.74,
        metalness: 0.03,
        side: THREE.DoubleSide
      }),
      formation: new THREE.MeshPhysicalMaterial({
        color: 0xb7e8f2,
        roughness: 0.5,
        metalness: 0.04,
        clearcoat: 0.28,
        clearcoatRoughness: 0.42
      }),
      darkFormation: new THREE.MeshStandardMaterial({
        color: 0x3c566a,
        roughness: 0.88,
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

  createGround() {
    const geometry = createStripGeometry({
      zSegments: WORLD.groundSegmentsZ,
      xSegments: WORLD.groundSegmentsX,
      minZ: WORLD.caveMinZ,
      maxZ: WORLD.caveMaxZ,
      getHalfWidth: (z) => this.getCaveHalfWidth(z),
      getY: (x, z, edgeFactor) =>
        Math.sin(x * 0.48) * 0.08 +
        Math.cos(z * 0.18) * 0.14 +
        Math.sin((x + z) * 0.11) * 0.06 +
        edgeFactor * edgeFactor * 0.26
    });

    const ground = new THREE.Mesh(geometry, this.materials.ground);
    ground.name = 'FrostedGround';
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  createPathMarkers() {
    const pathGeometry = createStripGeometry({
      zSegments: 42,
      xSegments: 1,
      minZ: WORLD.caveMinZ + 12,
      maxZ: WORLD.caveMaxZ - 7,
      getHalfWidth: () => 4.2,
      getY: () => 0.08
    });

    const path = new THREE.Mesh(pathGeometry, this.materials.path);
    path.name = 'ReadableSnowPath';
    path.receiveShadow = true;
    this.group.add(path);

    const startPad = new THREE.Mesh(
      new THREE.CircleGeometry(7.8, 48),
      this.materials.path.clone()
    );
    startPad.name = 'StartAreaPad';
    startPad.position.set(0, 0.095, ROVER.startPosition.z);
    startPad.rotation.x = -Math.PI / 2;
    startPad.material.opacity = 0.32;
    this.group.add(startPad);

    const startRing = new THREE.Mesh(
      new THREE.TorusGeometry(7.8, 0.07, 8, 80),
      this.materials.marker
    );
    startRing.name = 'StartAreaRing';
    startRing.position.set(0, 0.14, ROVER.startPosition.z);
    startRing.rotation.x = Math.PI / 2;
    this.group.add(startRing);
  }

  createWalls() {
    const leftWall = this.createSideWall('LeftIceWall', -1);
    const rightWall = this.createSideWall('RightIceWall', 1);
    const ceiling = this.createCeiling();
    const chamberEnd = this.createEndWall('ChamberEndWall', WORLD.caveMinZ);

    this.group.add(leftWall, rightWall, ceiling, chamberEnd);
    this.createBoundaryColliders();
  }

  createSideWall(name, side) {
    const vertices = [];
    const indices = [];
    const rows = WORLD.wallSegmentsZ;
    const columns = WORLD.wallSegmentsY;

    for (let row = 0; row <= rows; row += 1) {
      const z = THREE.MathUtils.lerp(WORLD.caveMaxZ, WORLD.caveMinZ, row / rows);
      const halfWidth = this.getCaveHalfWidth(z);

      for (let column = 0; column <= columns; column += 1) {
        const heightRatio = column / columns;
        const y = heightRatio * WORLD.caveHeight;
        const outward =
          0.35 +
          Math.abs(Math.sin(z * 0.065 + heightRatio * 4.8)) * 1.05 +
          Math.abs(Math.cos(z * 0.025 - heightRatio * 7.1)) * 0.55;
        const ledge = Math.sin(z * 0.14 + heightRatio * 8.3) * 0.42 * heightRatio;
        const x = side * (halfWidth + outward + ledge);
        vertices.push(x, y, z);
      }
    }

    addGridIndices(indices, rows, columns);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const wall = new THREE.Mesh(geometry, this.materials.wall);
    wall.name = name;
    wall.castShadow = true;
    wall.receiveShadow = true;
    return wall;
  }

  createCeiling() {
    const geometry = createStripGeometry({
      zSegments: WORLD.groundSegmentsZ,
      xSegments: WORLD.ceilingSegmentsX,
      minZ: WORLD.caveMinZ,
      maxZ: WORLD.caveMaxZ,
      getHalfWidth: (z) => this.getCaveHalfWidth(z) + 0.65,
      getY: (x, z, edgeFactor) =>
        WORLD.caveHeight -
        Math.pow(edgeFactor, 1.8) * 4.8 +
        Math.sin(z * 0.06 + x * 0.18) * 0.5 +
        Math.cos(z * 0.025) * 0.35
    });

    const ceiling = new THREE.Mesh(geometry, this.materials.ceiling);
    ceiling.name = 'IceCeiling';
    ceiling.castShadow = true;
    ceiling.receiveShadow = true;
    return ceiling;
  }

  createEndWall(name, z) {
    const halfWidth = this.getCaveHalfWidth(z) + 1.2;
    const geometry = new THREE.PlaneGeometry(halfWidth * 2, WORLD.caveHeight, 18, 12);
    const position = geometry.attributes.position;

    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const ripple = Math.sin(x * 0.65 + y * 0.45) * 0.5;
      position.setZ(index, ripple);
    }

    geometry.computeVertexNormals();

    const wall = new THREE.Mesh(geometry, this.materials.wall);
    wall.name = name;
    wall.position.set(0, WORLD.caveHeight / 2, z - 0.55);
    wall.castShadow = true;
    wall.receiveShadow = true;
    return wall;
  }

  createBoundaryColliders() {
    const segments = 36;
    const span = WORLD.caveMaxZ - WORLD.caveMinZ;
    const segmentLength = span / segments;
    const wallThickness = 3.6;

    for (let index = 0; index < segments; index += 1) {
      const z = WORLD.caveMaxZ - segmentLength * (index + 0.5);
      const halfWidth = this.getCaveHalfWidth(z);

      [-1, 1].forEach((side) => {
        this.collisionSystem.addBoxCollider({
          name: `${side < 0 ? 'Left' : 'Right'}WallBoundary_${index + 1}`,
          center: new THREE.Vector3(
            side * (halfWidth + wallThickness / 2 + 0.35),
            WORLD.caveHeight / 2,
            z
          ),
          size: new THREE.Vector3(wallThickness, WORLD.caveHeight, segmentLength + 1.2)
        });
      });
    }

    const endHalfWidth = this.getCaveHalfWidth(WORLD.caveMinZ);
    this.collisionSystem.addBoxCollider({
      name: 'EndWallBoundary',
      center: new THREE.Vector3(0, WORLD.caveHeight / 2, WORLD.caveMinZ - 1.8),
      size: new THREE.Vector3(endHalfWidth * 2 + 8, WORLD.caveHeight, 3.6)
    });

    const startHalfWidth = this.getCaveHalfWidth(WORLD.caveMaxZ);
    this.collisionSystem.addBoxCollider({
      name: 'StartBoundary',
      center: new THREE.Vector3(0, WORLD.caveHeight / 2, WORLD.caveMaxZ + 1.8),
      size: new THREE.Vector3(startHalfWidth * 2 + 8, WORLD.caveHeight, 3.6)
    });
  }

  registerCollider(mesh, padding = 0.35) {
    this.collisionSystem.addObjectCollider(mesh, mesh.name, padding);
  }

  createIceFormations() {
    for (let index = 0; index < WORLD.stalagmiteCount; index += 1) {
      const mesh = this.createConeFormation('Stalagmite', false);
      const { x, z } = this.getSideObstaclePosition();
      mesh.position.set(x, mesh.userData.height / 2 - 0.04, z);
      mesh.rotation.y = this.randomRange(0, Math.PI * 2);
      this.group.add(mesh);

      if (mesh.userData.height >= 1.8 || mesh.userData.radius >= 0.34) {
        this.registerCollider(mesh, 0.38);
      }
    }

    for (let index = 0; index < WORLD.stalactiteCount; index += 1) {
      const mesh = this.createConeFormation('Stalactite', true);
      const { x, z } = this.getSideObstaclePosition();
      mesh.position.set(
        x,
        WORLD.caveHeight - mesh.userData.height / 2 + 0.05,
        z
      );
      mesh.rotation.x = Math.PI;
      mesh.rotation.y = this.randomRange(0, Math.PI * 2);
      this.group.add(mesh);
    }

    for (let index = 0; index < WORLD.pillarCount; index += 1) {
      const pillar = this.createGroundTouchingColumn(index);
      this.group.add(pillar);
      this.registerCollider(pillar, 0.48);
    }
  }

  createConeFormation(prefix, hanging) {
    const height = hanging
      ? this.randomRange(1.3, 4.6)
      : this.randomRange(1.1, 4.8);
    const radius = this.randomRange(0.2, hanging ? 0.66 : 0.82);
    const geometry = new THREE.ConeGeometry(radius, height, 8, 2);
    const material =
      this.random() > 0.72 ? this.materials.darkFormation : this.materials.formation;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${prefix}_${Math.floor(this.random() * 10000)}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.height = height;
    mesh.userData.radius = radius;
    return mesh;
  }

  createGroundTouchingColumn(index) {
    const z = this.randomRange(WORLD.caveMinZ + 28, -58);
    const side = this.random() > 0.5 ? 1 : -1;
    const halfWidth = this.getCaveHalfWidth(z);
    const radius = this.randomRange(0.45, 0.95);
    const height = WORLD.caveHeight - this.randomRange(1.4, 3.2);
    const geometry = new THREE.CylinderGeometry(
      radius * 0.85,
      radius,
      height,
      8,
      8
    );

    const position = geometry.attributes.position;
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      const y = position.getY(vertex);
      const wobble = Math.sin(y * 0.9 + index) * 0.08;
      position.setX(vertex, position.getX(vertex) * (1 + wobble));
      position.setZ(vertex, position.getZ(vertex) * (1 - wobble * 0.6));
    }
    geometry.computeVertexNormals();

    const pillar = new THREE.Mesh(geometry, this.materials.formation);
    pillar.name = `GroundTouchingIceColumn_${index + 1}`;
    pillar.position.set(
      side * this.randomRange(halfWidth * 0.48, halfWidth - 2.2),
      height / 2,
      z
    );
    pillar.rotation.y = this.randomRange(0, Math.PI);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    return pillar;
  }

  createCrystals() {
    for (let index = 0; index < WORLD.crystalCount; index += 1) {
      const z = this.randomRange(WORLD.caveMinZ + 10, WORLD.caveMaxZ - 8);
      const side = this.random() > 0.5 ? 1 : -1;
      const halfWidth = this.getCaveHalfWidth(z);
      const chamber = z < -86;
      const minFactor = chamber ? 0.18 : 0.5;
      const x = side * this.randomRange(halfWidth * minFactor, halfWidth - 1.7);
      const scale = chamber
        ? this.randomRange(0.8, 1.95)
        : this.randomRange(0.65, 1.5);
      const crystal = this.createCrystal(index, x, z, scale);

      this.group.add(crystal.mesh, crystal.light);
      this.crystals.push(crystal);

      if (crystal.mesh.scale.y >= 1.25 || crystal.mesh.scale.x >= 0.55) {
        this.registerCollider(crystal.mesh, 0.36);
      }
    }
  }

  createSampleArea() {
    const { x, z, radius } = WORLD.sampleArea;

    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 48),
      this.materials.path.clone()
    );
    pad.name = 'FutureSampleAreaPad';
    pad.position.set(x, 0.11, z);
    pad.rotation.x = -Math.PI / 2;
    pad.material.color.setHex(0xa8eef3);
    pad.material.emissive.setHex(0x0f4850);
    pad.material.opacity = 0.38;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.075, 8, 88),
      this.materials.marker
    );
    ring.name = 'FutureSampleAreaRing';
    ring.position.set(x, 0.17, z);
    ring.rotation.x = Math.PI / 2;

    this.group.add(pad, ring);

    const offsets = [
      [-2.4, -1.8],
      [2.2, -1.2],
      [-1.4, 2.0],
      [2.8, 1.9]
    ];

    offsets.forEach(([offsetX, offsetZ], index) => {
      const crystal = this.createCrystal(
        WORLD.crystalCount + index,
        x + offsetX,
        z + offsetZ,
        1.55
      );
      this.group.add(crystal.mesh, crystal.light);
      this.crystals.push(crystal);
      this.registerScannableTarget(crystal, index);
      this.registerCollider(crystal.mesh, 0.4);
    });
  }

  registerScannableTarget(crystal, index) {
    crystal.scanState = 'unscanned';
    crystal.scanBoost = 0;
    crystal.mesh.userData.scanState = crystal.scanState;
    crystal.mesh.userData.scannable = true;

    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.035, 8, 72),
      this.materials.scannerMarker.clone()
    );
    marker.name = `ScannerTargetRing_${index + 1}`;
    marker.position.set(crystal.mesh.position.x, 0.18, crystal.mesh.position.z);
    marker.rotation.x = Math.PI / 2;
    this.group.add(marker);

    crystal.scanMarker = marker;
    this.scannableTargets.push(crystal);
  }

  createCrystal(index, x, z, scale) {
    const material = new THREE.MeshPhysicalMaterial({
      color: index % 2 === 0 ? COLORS.crystalCyan : COLORS.crystalBlue,
      emissive: index % 2 === 0 ? COLORS.crystalBlue : COLORS.crystalCyan,
      emissiveIntensity: 1.5,
      roughness: 0.22,
      metalness: 0.05,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18
    });

    const geometry = new THREE.OctahedronGeometry(0.56, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `EmissiveCrystal_${index + 1}`;
    mesh.position.set(x, this.randomRange(0.55, 2.0), z);
    mesh.rotation.set(
      this.randomRange(-0.34, 0.34),
      this.randomRange(0, Math.PI * 2),
      this.randomRange(-0.28, 0.28)
    );
    mesh.scale.set(scale * 0.52, scale * this.randomRange(1.25, 2.25), scale * 0.52);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const light = new THREE.PointLight(material.emissive, 0.72, 9.5, 1.7);
    light.name = `CrystalGlow_${index + 1}`;
    light.position.copy(mesh.position);

    return {
      mesh,
      material,
      light,
      baseScale: mesh.scale.clone(),
      phase: this.randomRange(0, Math.PI * 2)
    };
  }

  getSideObstaclePosition() {
    const z = this.randomRange(WORLD.caveMinZ + 12, WORLD.caveMaxZ - 10);
    const halfWidth = this.getCaveHalfWidth(z);
    const side = this.random() > 0.5 ? 1 : -1;
    const innerClearance = z < -88 ? 9.2 : 6.2;
    const maxX = Math.max(innerClearance + 1.2, halfWidth - 2.6);

    return {
      x: side * this.randomRange(innerClearance, maxX),
      z
    };
  }

  randomRange(min, max) {
    return min + (max - min) * this.random();
  }
}

function createStripGeometry({
  zSegments,
  xSegments,
  minZ,
  maxZ,
  getHalfWidth,
  getY
}) {
  const vertices = [];
  const indices = [];

  for (let row = 0; row <= zSegments; row += 1) {
    const z = THREE.MathUtils.lerp(maxZ, minZ, row / zSegments);
    const halfWidth = getHalfWidth(z);

    for (let column = 0; column <= xSegments; column += 1) {
      const t = column / xSegments;
      const centered = t * 2 - 1;
      const x = centered * halfWidth;
      const edgeFactor = Math.abs(centered);
      const y = getY(x, z, edgeFactor);
      vertices.push(x, y, z);
    }
  }

  addGridIndices(indices, zSegments, xSegments);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addGridIndices(indices, rows, columns) {
  const stride = columns + 1;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * stride + column;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
}

function smoothstep(edge0, edge1, value) {
  const x = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function createSeededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}
