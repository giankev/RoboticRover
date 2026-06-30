import * as THREE from 'three';
import { COLORS, ROVER, WORLD } from '../config/constants.js';
import { CollisionSystem } from './CollisionSystem.js';
import { createCaveMaterials } from './MaterialFactory.js';
import { getProceduralTextures } from './ProceduralTextures.js';

export class IceCave {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'IceCave';
    this.time = 0;
    this.crystals = [];
    this.samples = [];
    this.scannableTargets = [];
    this.random = createSeededRandom(17);
    this.textures = getProceduralTextures();
    this.focusPosition = new THREE.Vector3();

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
    this.createFloorIceLayers();
    this.createGlossyPuddles();
    this.createPathMarkers();
    this.createWalls();
    this.createIceFormations();
    this.createCrystals();
    this.createSampleTargets();
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
      if (crystal.light) {
        crystal.light.intensity =
          0.28 + pulse * 0.82 + scannedBoost * 0.42 + scanBoost * 0.34;
      }

      if (crystal.scanMarker) {
        const collected = crystal.sample?.collected;
        const scanned = crystal.scanState === 'scanned';
        const nearest = crystal.isNearestTarget;
        const collecting = crystal.collectionState === 'collecting';

        crystal.scanMarker.visible = !collected;
        if (!collected) {
          const baseOpacity = scanned ? 0.5 : 0.18 + pulse * 0.14;
          crystal.scanMarker.material.opacity = nearest || collecting
            ? Math.min(0.78, baseOpacity + 0.28)
            : baseOpacity;
          crystal.scanMarker.scale.setScalar(
            nearest || collecting ? 1.18 + pulse * 0.08 : 0.92 + pulse * 0.04
          );
          crystal.scanMarker.rotation.z += delta * (nearest ? 0.9 : 0.48);
        }
      }
    }

    for (const sample of this.samples) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 3.1 + sample.phase);
      const collected = sample.collected;
      const scanned = sample.scanned;
      const collecting = sample.collectionState === 'collecting';

      sample.material.emissiveIntensity =
        0.25 + pulse * 0.28 + (scanned ? 0.75 : 0) + (collecting ? 0.55 : 0);
      sample.light.intensity =
        collected ? 0 : 0.14 + pulse * 0.22 + (scanned ? 0.56 : 0);

      if (!collected) {
        sample.mesh.scale.copy(sample.baseScale).multiplyScalar(0.92 + pulse * 0.1);
      }
    }
  }

  updateTargetFocus(roverPosition, scanDistance, collectionDistance) {
    let nearestTarget = null;
    let nearestDistance = Infinity;

    for (const target of this.scannableTargets) {
      target.isNearestTarget = false;

      if (target.sample?.collected) {
        continue;
      }

      this.getTargetFocusPosition(target, this.focusPosition);
      const distance = roverPosition.distanceTo(this.focusPosition);
      const actionDistance = target.sample?.scanned
        ? collectionDistance
        : scanDistance;

      if (distance <= actionDistance + 0.85 && distance < nearestDistance) {
        nearestTarget = target;
        nearestDistance = distance;
      }
    }

    if (nearestTarget) {
      nearestTarget.isNearestTarget = true;
    }
  }

  clearTargetFocus() {
    for (const target of this.scannableTargets) {
      target.isNearestTarget = false;
    }
  }

  getTargetFocusPosition(target, destination) {
    if (target.sample?.pickupAnchor) {
      target.sample.pickupAnchor.getWorldPosition(destination);
      return destination;
    }

    target.mesh.getWorldPosition(destination);
    return destination;
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
    return createCaveMaterials(this.textures);
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

  createFloorIceLayers() {
    const patchCount = 22;

    for (let index = 0; index < patchCount; index += 1) {
      const z = this.randomRange(WORLD.caveMinZ + 10, WORLD.caveMaxZ - 14);
      const halfWidth = this.getCaveHalfWidth(z);
      const side = this.random() > 0.5 ? 1 : -1;
      const x = side * this.randomRange(halfWidth * 0.28, halfWidth * 0.78);
      const radius = this.randomRange(2.1, z < -80 ? 6.2 : 4.4);
      const sheet = new THREE.Mesh(
        createIceSheetGeometry(radius, 9 + Math.floor(this.random() * 5), index * 17),
        this.materials.iceSheet.clone()
      );

      sheet.name = `LayeredIceSheet_${index + 1}`;
      sheet.position.set(x, 0.13 + this.randomRange(0, 0.045), z);
      sheet.rotation.y = this.randomRange(0, Math.PI * 2);
      sheet.scale.set(1, 1, this.randomRange(0.52, 1.22));
      sheet.material.color.offsetHSL(this.randomRange(-0.015, 0.02), 0, this.randomRange(-0.08, 0.08));
      sheet.receiveShadow = true;
      this.group.add(sheet);

      if (index % 2 === 0) {
        const cracks = new THREE.Line(
          createCrackLineGeometry(radius * 0.72, index * 29),
          new THREE.LineBasicMaterial({
            color: 0x1d5b71,
            transparent: true,
            opacity: 0.3,
            depthWrite: false
          })
        );
        cracks.name = `IceSheetCracks_${index + 1}`;
        cracks.position.copy(sheet.position);
        cracks.position.y += 0.012;
        cracks.rotation.y = sheet.rotation.y;
        cracks.scale.copy(sheet.scale);
        this.group.add(cracks);
      }
    }
  }

  createGlossyPuddles() {
    const puddles = [
      { x: -2.4, z: 6, radius: 2.1, stretch: 0.46, rotation: 0.22 },
      { x: -2.3, z: -57, radius: 2.6, stretch: 0.44, rotation: 0.48 },
      { x: 2.8, z: -96, radius: 2.8, stretch: 0.42, rotation: -0.2 },
      { x: 2.5, z: -177, radius: 3.1, stretch: 0.46, rotation: -0.5 }
    ];

    puddles.forEach((puddle, index) => {
      const patch = new THREE.Mesh(
        createIceSheetGeometry(puddle.radius, 14, 401 + index * 31),
        this.materials.frozenPuddle
      );

      patch.name = `GlossyFrozenPatch_${index + 1}`;
      patch.position.set(puddle.x, 0.17, puddle.z);
      patch.rotation.y = puddle.rotation;
      patch.scale.z = puddle.stretch;
      patch.receiveShadow = true;
      // Shared PBR gloss only: no reflector, render target, or collision volume.
      this.group.add(patch);
    });
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
    const uvs = [];
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
          Math.abs(Math.sin(z * 0.065 + heightRatio * 4.8)) * 1.2 +
          Math.abs(Math.cos(z * 0.025 - heightRatio * 7.1)) * 0.72;
        const ledge =
          Math.sin(z * 0.14 + heightRatio * 8.3) * 0.56 * heightRatio +
          Math.cos(z * 0.2 - heightRatio * 13.7) * 0.24;
        const verticalRidge =
          Math.sin(z * 0.11 + heightRatio * 16.4) * 0.3 *
          Math.sin(heightRatio * Math.PI);
        const x = side * (halfWidth + outward + ledge);
        vertices.push(x, y, z + verticalRidge);
        uvs.push(row / rows, heightRatio);
      }
    }

    addGridIndices(indices, rows, columns);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const wall = new THREE.Mesh(geometry, this.materials.wall);
    wall.name = name;
    wall.castShadow = true;
    wall.receiveShadow = true;
    return wall;
  }

  getCeilingY(x, z) {
    const roofHalfWidth = this.getCaveHalfWidth(z) + 0.65;
    const edgeFactor = THREE.MathUtils.clamp(Math.abs(x) / roofHalfWidth, 0, 1);
    const longRidge = Math.pow(Math.sin(z * 0.052 + x * 0.11), 2) * 0.95;
    const crossRidge = Math.pow(Math.sin(x * 0.3 - z * 0.075), 2) * 0.64;

    return (
      WORLD.caveHeight -
      Math.pow(edgeFactor, 1.55) * 6.15 -
      longRidge -
      crossRidge +
      Math.sin(z * 0.06 + x * 0.18) * 0.58 +
      Math.cos(z * 0.025 - x * 0.11) * 0.42 +
      Math.sin(x * 0.42 + z * 0.095) * 0.26
    );
  }

  createCeiling() {
    const geometry = createStripGeometry({
      zSegments: WORLD.groundSegmentsZ,
      xSegments: WORLD.ceilingSegmentsX,
      minZ: WORLD.caveMinZ,
      maxZ: WORLD.caveMaxZ,
      getHalfWidth: (z) => this.getCaveHalfWidth(z) + 0.65,
      getY: (x, z) => this.getCeilingY(x, z)
    });

    const ceilingGroup = new THREE.Group();
    ceilingGroup.name = 'IceCeiling';
    const roof = new THREE.Mesh(geometry, this.materials.ceiling);
    roof.name = 'IceCeilingRoof';
    roof.castShadow = true;
    roof.receiveShadow = true;
    ceilingGroup.add(roof);
    this.createCeilingIceSheets(ceilingGroup);
    this.ceilingGroup = ceilingGroup;
    return ceilingGroup;
  }

  createCeilingIceSheets(ceilingGroup) {
    const sheetCount = 26;

    for (let index = 0; index < sheetCount; index += 1) {
      const z = this.randomRange(WORLD.caveMinZ + 9, WORLD.caveMaxZ - 8);
      const halfWidth = this.getCaveHalfWidth(z);
      const side = this.random() > 0.5 ? 1 : -1;
      const inset = this.randomRange(0.7, z < -80 ? 7.8 : 4.6);
      const x = side * Math.max(halfWidth * 0.32, halfWidth - inset);
      const width = this.randomRange(2.2, z < -80 ? 8.4 : 5.3);
      const drop = this.randomRange(0.8, 2.9);
      const material = (
        this.random() > 0.76 ? this.materials.darkFormation : this.materials.formation
      ).clone();

      material.color.offsetHSL(
        this.randomRange(-0.025, 0.025),
        this.randomRange(-0.04, 0.035),
        this.randomRange(-0.12, 0.08)
      );

      const sheet = new THREE.Mesh(
        createHangingIceSheetGeometry({
          width,
          thickness: this.randomRange(0.16, 0.46),
          drop,
          segments: 4 + Math.floor(this.random() * 4),
          seed: 8000 + index * 137
        }),
        material
      );

      sheet.name = `HangingIceSheet_${index + 1}`;
      sheet.position.set(x, this.getCeilingY(x, z) + 0.08, z);
      sheet.rotation.y = this.randomRange(-0.34, 0.34);
      sheet.castShadow = true;
      sheet.receiveShadow = true;
      ceilingGroup.add(sheet);

      if (index % 3 === 0) {
        const shard = new THREE.Mesh(
          createIrregularTaperedGeometry({
            height: drop * this.randomRange(0.66, 1.16),
            radius: this.randomRange(0.12, 0.3),
            radialSegments: 6,
            rings: 4,
            seed: 10000 + index * 89,
            tip: true
          }),
          material.clone()
        );
        shard.name = `CeilingSheetShard_${index + 1}`;
        shard.position.set(
          x + this.randomRange(-width * 0.35, width * 0.35),
          sheet.position.y,
          z + this.randomRange(-0.42, 0.42)
        );
        shard.rotation.x = Math.PI;
        shard.rotation.y = this.randomRange(0, Math.PI * 2);
        shard.castShadow = true;
        shard.receiveShadow = true;
        ceilingGroup.add(shard);
      }
    }
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
      const mesh = this.createIceSpikeFormation('Stalagmite', false);
      const { x, z } = this.getSideObstaclePosition();
      mesh.position.set(x, -0.03, z);
      mesh.rotation.y = this.randomRange(0, Math.PI * 2);
      this.group.add(mesh);

      if (mesh.userData.height >= 1.8 || mesh.userData.radius >= 0.34) {
        this.registerCollider(mesh, 0.38);
      }
    }

    for (let index = 0; index < WORLD.stalactiteCount; index += 1) {
      const mesh = this.createIceSpikeFormation('Stalactite', true);
      const { x, z } = this.getSideObstaclePosition();
      mesh.position.set(x, this.getCeilingY(x, z) + 0.04, z);
      mesh.rotation.x = Math.PI;
      mesh.rotation.y = this.randomRange(0, Math.PI * 2);
      this.ceilingGroup.add(mesh);
    }

    for (let index = 0; index < WORLD.pillarCount; index += 1) {
      const pillar = this.createGroundTouchingColumn(index);
      this.group.add(pillar);
      this.registerCollider(pillar, 0.48);
    }
  }

  createIceSpikeFormation(prefix, hanging) {
    const height = hanging
      ? this.randomRange(1.3, 4.6)
      : this.randomRange(1.1, 4.8);
    const radius = this.randomRange(0.2, hanging ? 0.66 : 0.82);
    const formation = new THREE.Group();
    formation.name = `${prefix}_${Math.floor(this.random() * 10000)}`;

    const material = this.random() > 0.72
      ? this.materials.darkFormation
      : this.materials.formation;
    const primary = new THREE.Mesh(
      createIrregularTaperedGeometry({
        height,
        radius,
        radialSegments: 7 + Math.floor(this.random() * 4),
        rings: 4 + Math.floor(this.random() * 3),
        seed: Math.floor(this.random() * 100000),
        tip: true
      }),
      material
    );
    primary.name = `${formation.name}_Core`;
    primary.castShadow = true;
    primary.receiveShadow = true;
    formation.add(primary);

    const shardCount = height > 2 ? 1 + Math.floor(this.random() * 2) : 1;
    for (let index = 0; index < shardCount; index += 1) {
      const angle = this.randomRange(0, Math.PI * 2);
      const shardHeight = height * this.randomRange(0.4, 0.76);
      const shardRadius = radius * this.randomRange(0.22, 0.44);
      const shard = new THREE.Mesh(
        createIrregularTaperedGeometry({
          height: shardHeight,
          radius: shardRadius,
          radialSegments: 6,
          rings: 3,
          seed: Math.floor(this.random() * 100000),
          tip: true
        }),
        material
      );
      shard.name = `${formation.name}_Shard_${index + 1}`;
      shard.position.set(
        Math.cos(angle) * radius * this.randomRange(0.35, 0.64),
        0,
        Math.sin(angle) * radius * this.randomRange(0.35, 0.64)
      );
      shard.rotation.y = this.randomRange(0, Math.PI * 2);
      shard.castShadow = true;
      shard.receiveShadow = true;
      formation.add(shard);
    }

    formation.userData.height = height;
    formation.userData.radius = radius;
    return formation;
  }

  createGroundTouchingColumn(index) {
    const z = this.randomRange(WORLD.caveMinZ + 28, -58);
    const side = this.random() > 0.5 ? 1 : -1;
    const halfWidth = this.getCaveHalfWidth(z);
    const radius = this.randomRange(0.45, 0.95);
    const height = WORLD.caveHeight - this.randomRange(1.4, 3.2);
    const pillar = new THREE.Group();
    pillar.name = `GroundTouchingIceColumn_${index + 1}`;
    pillar.position.set(
      side * this.randomRange(halfWidth * 0.48, halfWidth - 2.2),
      0,
      z
    );
    pillar.rotation.y = this.randomRange(0, Math.PI);

    const core = new THREE.Mesh(
      createIrregularTaperedGeometry({
        height,
        radius,
        topRadius: radius * this.randomRange(0.5, 0.78),
        radialSegments: 9,
        rings: 8,
        seed: 3000 + index * 71
      }),
      this.materials.formation
    );
    core.name = `${pillar.name}_Core`;
    core.castShadow = true;
    core.receiveShadow = true;
    pillar.add(core);

    [0.2, 0.56, 0.82].forEach((heightFactor, layerIndex) => {
      const layer = new THREE.Mesh(
        createIrregularTaperedGeometry({
          height: this.randomRange(0.26, 0.48),
          radius: radius * this.randomRange(0.95, 1.15),
          topRadius: radius * this.randomRange(0.82, 1.02),
          radialSegments: 9,
          rings: 2,
          seed: 4000 + index * 113 + layerIndex
        }),
        this.materials.formation
      );
      layer.name = `${pillar.name}_IceBand_${layerIndex + 1}`;
      layer.position.y = height * heightFactor;
      layer.castShadow = true;
      layer.receiveShadow = true;
      pillar.add(layer);
    });

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
      const hasGlowLight = index % 6 === 0 || (chamber && scale > 1.72);
      const crystal = this.createCrystal(index, x, z, scale, hasGlowLight);

      this.group.add(crystal.mesh);
      if (crystal.light) {
        this.group.add(crystal.light);
      }
      this.crystals.push(crystal);

      if (crystal.mesh.scale.y >= 1.25 || crystal.mesh.scale.x >= 0.55) {
        this.registerCollider(crystal.mesh, 0.36);
      }
    }
  }

  createSampleTargets() {
    WORLD.sampleTargets.forEach((definition, index) => {
      const placement = this.getReachableSampleTargetPlacement(definition);
      const crystal = this.createCrystal(
        WORLD.crystalCount + index,
        placement.x,
        placement.z,
        1.4,
        true
      );
      this.group.add(crystal.mesh, crystal.light);
      this.crystals.push(crystal);
      this.registerScannableTarget(crystal, index, placement.pickupDirection);
      this.registerCollider(crystal.mesh, 0.4);
    });
  }

  getReachableSampleTargetPlacement(definition) {
    const pickupDirection = new THREE.Vector3(
      definition.pickupDirection.x,
      0,
      definition.pickupDirection.z
    ).normalize();
    const lateral = new THREE.Vector3(-pickupDirection.z, 0, pickupDirection.x);
    const lateralOffsets = [0, -1.8, 1.8, -3.6, 3.6, -5.4, 5.4];
    const alongDirectionOffsets = [0, -2, -4, 2, 4];

    for (const alongDirectionOffset of alongDirectionOffsets) {
      for (const lateralOffset of lateralOffsets) {
        const candidate = new THREE.Vector3(
          definition.x +
            pickupDirection.x * alongDirectionOffset +
            lateral.x * lateralOffset,
          0,
          definition.z +
            pickupDirection.z * alongDirectionOffset +
            lateral.z * lateralOffset
        );
        const pickupPosition = candidate
          .clone()
          .addScaledVector(pickupDirection, 1.35);
        const roverApproach = pickupPosition
          .clone()
          .addScaledVector(pickupDirection, 2.2);

        if (
          this.collisionSystem.isPositionValid(candidate) &&
          this.collisionSystem.isPositionValid(roverApproach)
        ) {
          return {
            x: candidate.x,
            z: candidate.z,
            pickupDirection
          };
        }
      }
    }

    return { x: definition.x, z: definition.z, pickupDirection };
  }

  registerScannableTarget(crystal, index, pickupDirection) {
    crystal.scanState = 'unscanned';
    crystal.scanBoost = 0;
    crystal.mesh.userData.scanState = crystal.scanState;
    crystal.mesh.userData.scannable = true;

    crystal.sample = this.createSampleFragment(crystal, index, pickupDirection);
    crystal.sample.target = crystal;
    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.024, 8, 72),
      this.materials.scannerMarker.clone()
    );
    marker.name = `ScannerTargetRing_${index + 1}`;
    marker.position.copy(crystal.sample.anchorPosition);
    marker.position.y = 0.2;
    marker.rotation.x = Math.PI / 2;
    this.group.add(marker);

    crystal.scanMarker = marker;
    crystal.sample.marker = marker;
    crystal.collectionState = crystal.sample.collectionState;
    crystal.sampleGroup = crystal.sample.group;
    crystal.sampleMesh = crystal.sample.mesh;
    crystal.sampleMaterial = crystal.sample.material;
    crystal.sampleLight = crystal.sample.light;
    crystal.mesh.userData.collectionState = crystal.collectionState;

    this.group.add(crystal.sampleGroup, crystal.sample.pickupAnchor);
    this.samples.push(crystal.sample);
    this.scannableTargets.push(crystal);
  }

  createSampleFragment(crystal, index, pickupDirection) {
    const id = `sample-${index + 1}`;
    const sampleTextures = this.textures.sample;
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x93d4d0,
      map: sampleTextures.map,
      normalMap: sampleTextures.normalMap,
      normalScale: new THREE.Vector2(0.28, 0.28),
      roughnessMap: sampleTextures.roughnessMap,
      metalnessMap: sampleTextures.metalnessMap,
      emissive: 0x2d8e86,
      emissiveMap: sampleTextures.emissiveMap,
      emissiveIntensity: 0.42,
      roughness: 0.26,
      metalness: 0.08,
      clearcoat: 0.48,
      clearcoatRoughness: 0.2
    });

    const group = new THREE.Group();
    group.name = `CollectibleSample_${index + 1}`;
    const direction = pickupDirection
      ? pickupDirection.clone()
      : new THREE.Vector3(index % 2 === 0 ? 1 : -1, 0, 0);

    const anchorPosition = new THREE.Vector3(
      crystal.mesh.position.x + direction.x * 1.35,
      0.36,
      crystal.mesh.position.z + direction.z * 1.35
    );
    const pickupAnchor = new THREE.Object3D();
    pickupAnchor.name = `SamplePickupAnchor_${index + 1}`;
    pickupAnchor.position.copy(anchorPosition);
    pickupAnchor.userData.sampleId = id;
    pickupAnchor.userData.scannable = true;
    pickupAnchor.userData.scanState = 'unscanned';
    pickupAnchor.userData.collectionState = 'uncollected';
    group.position.copy(anchorPosition);
    group.rotation.y = this.randomRange(0, Math.PI * 2);
    group.userData.scannable = true;
    group.userData.sampleId = id;
    group.userData.scanState = 'unscanned';
    group.userData.collectionState = 'uncollected';

    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), material);
    mesh.name = `SampleFragmentCore_${index + 1}`;
    mesh.userData.sampleId = id;
    mesh.userData.scanState = 'unscanned';
    mesh.userData.collectionState = 'uncollected';
    mesh.scale.set(1.12, 0.64, 0.82);
    mesh.rotation.set(0.2, 0.35, -0.18);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const light = new THREE.PointLight(material.emissive, 0.18, 4.4, 1.8);
    light.name = `SampleFragmentGlow_${index + 1}`;
    light.position.set(0, 0.18, 0);
    group.add(light);

    return {
      id,
      group,
      mesh,
      material,
      light,
      baseScale: mesh.scale.clone(),
      baseColor: material.color.clone(),
      baseEmissive: material.emissive.clone(),
      baseLightColor: light.color.clone(),
      anchorPosition,
      pickupAnchor,
      homePosition: group.position.clone(),
      homeQuaternion: group.quaternion.clone(),
      homeScale: group.scale.clone(),
      phase: this.randomRange(0, Math.PI * 2),
      scanState: 'unscanned',
      collectionState: 'uncollected',
      scanned: false,
      collected: false
    };
  }

  createCrystal(index, x, z, scale, hasGlowLight = false) {
    const crystalTextures = this.textures.crystal;
    const material = new THREE.MeshPhysicalMaterial({
      color: index % 2 === 0 ? 0x8ff6f0 : 0x66cdef,
      map: crystalTextures.map,
      normalMap: crystalTextures.normalMap,
      normalScale: new THREE.Vector2(0.24, 0.24),
      roughnessMap: crystalTextures.roughnessMap,
      emissive: index % 2 === 0 ? COLORS.crystalBlue : COLORS.crystalCyan,
      emissiveMap: crystalTextures.emissiveMap,
      emissiveIntensity: hasGlowLight ? 1.2 : 1.42,
      roughness: 0.18,
      metalness: 0.08,
      clearcoat: 0.72,
      clearcoatRoughness: 0.12
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

    const light = hasGlowLight
      ? new THREE.PointLight(material.emissive, 0.66, 9.5, 1.8)
      : null;
    if (light) {
      light.name = `CrystalGlow_${index + 1}`;
      light.position.copy(mesh.position);
    }

    return {
      mesh,
      material,
      light,
      baseScale: mesh.scale.clone(),
      baseColor: material.color.clone(),
      baseEmissive: material.emissive.clone(),
      baseLightColor: light?.color.clone() ?? null,
      phase: this.randomRange(0, Math.PI * 2)
    };
  }

  resetScannableTargets() {
    this.group.updateWorldMatrix(true, true);

    for (const target of this.scannableTargets) {
      const sample = target.sample;
      target.scanState = 'unscanned';
      target.scanBoost = 0;
      target.isNearestTarget = false;
      target.collectionState = 'uncollected';
      target.mesh.userData.scanState = 'unscanned';
      target.mesh.userData.collectionState = 'uncollected';
      target.mesh.userData.sampleState = 'unscanned';
      target.material.color.copy(target.baseColor);
      target.material.emissive.copy(target.baseEmissive);
      target.light.color.copy(target.baseLightColor);

      if (target.scanMarker) {
        target.scanMarker.visible = true;
        target.scanMarker.position.copy(sample.anchorPosition);
        target.scanMarker.position.y = 0.2;
        target.scanMarker.scale.setScalar(1);
        target.scanMarker.material.opacity = 0.28;
        target.scanMarker.material.color.setHex(COLORS.scanner);
      }

      if (!sample) {
        continue;
      }

      if (sample.group.parent !== this.group) {
        this.group.attach(sample.group);
      }

      sample.group.position.copy(sample.homePosition);
      sample.group.quaternion.copy(sample.homeQuaternion);
      sample.group.scale.copy(sample.homeScale);
      sample.group.visible = true;
      sample.mesh.visible = true;
      sample.light.visible = true;
      sample.group.userData.scanState = 'unscanned';
      sample.group.userData.collectionState = 'uncollected';
      sample.group.userData.collected = false;
      sample.mesh.scale.copy(sample.baseScale);
      sample.mesh.userData.scanState = 'unscanned';
      sample.mesh.userData.collectionState = 'uncollected';
      sample.mesh.userData.collected = false;
      sample.material.color.copy(sample.baseColor);
      sample.material.emissive.copy(sample.baseEmissive);
      sample.light.color.copy(sample.baseLightColor);
      sample.light.intensity = 0.18;
      sample.scanned = false;
      sample.collected = false;
      sample.scanState = 'unscanned';
      sample.collectionState = 'uncollected';
      sample.pickupAnchor.userData.scanState = 'unscanned';
      sample.pickupAnchor.userData.collectionState = 'uncollected';
      sample.pickupAnchor.userData.collected = false;
    }
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
  const uvs = [];
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
      uvs.push(t, row / zSegments);
    }
  }

  addGridIndices(indices, zSegments, xSegments);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createIrregularTaperedGeometry({
  height,
  radius,
  topRadius = null,
  radialSegments = 8,
  rings = 5,
  seed = 1,
  tip = false
}) {
  const vertices = [];
  const uvs = [];
  const indices = [];
  const ringCount = Math.max(2, rings);
  const topRingRadius = topRadius ?? radius * 0.11;

  for (let ring = 0; ring < ringCount; ring += 1) {
    const t = tip ? ring / ringCount : ring / (ringCount - 1);
    const y = height * t;
    const taper = tip
      ? THREE.MathUtils.lerp(radius, Math.max(radius * 0.045, 0.018), Math.pow(t, 0.72))
      : THREE.MathUtils.lerp(radius, topRingRadius, t);

    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2;
      const facetNoise =
        0.86 +
        Math.sin(angle * 3 + seed * 0.013) * 0.09 +
        Math.cos(angle * 5 - seed * 0.021) * 0.055;
      const ringNoise = 1 + Math.sin(ring * 2.7 + segment * 1.9 + seed * 0.007) * 0.075;
      const localRadius = Math.max(0.014, taper * facetNoise * ringNoise);
      vertices.push(
        Math.cos(angle) * localRadius,
        y,
        Math.sin(angle) * localRadius
      );
      uvs.push(segment / radialSegments, t);
    }
  }

  for (let ring = 0; ring < ringCount - 1; ring += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      const a = ring * radialSegments + segment;
      const b = ring * radialSegments + next;
      const c = (ring + 1) * radialSegments + segment;
      const d = (ring + 1) * radialSegments + next;
      indices.push(a, c, b, b, c, d);
    }
  }

  const baseCenterIndex = vertices.length / 3;
  vertices.push(0, 0, 0);
  uvs.push(0.5, 0.5);
  for (let segment = 0; segment < radialSegments; segment += 1) {
    const next = (segment + 1) % radialSegments;
    indices.push(baseCenterIndex, next, segment);
  }

  if (tip) {
    const tipIndex = vertices.length / 3;
    vertices.push(0, height, 0);
    uvs.push(0.5, 1);
    const topRingStart = (ringCount - 1) * radialSegments;
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      indices.push(topRingStart + segment, topRingStart + next, tipIndex);
    }
  } else {
    const topCenterIndex = vertices.length / 3;
    vertices.push(0, height, 0);
    uvs.push(0.5, 1);
    const topRingStart = (ringCount - 1) * radialSegments;
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      indices.push(topCenterIndex, topRingStart + segment, topRingStart + next);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createIceSheetGeometry(radius, segments, seed) {
  const vertices = [0, 0, 0];
  const uvs = [0.5, 0.5];
  const indices = [];

  for (let segment = 0; segment < segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2;
    const variation =
      0.72 +
      Math.sin(angle * 3 + seed * 0.12) * 0.12 +
      Math.cos(angle * 5 - seed * 0.07) * 0.08;
    const localRadius = radius * variation;
    vertices.push(
      Math.cos(angle) * localRadius,
      Math.sin(angle * 4 + seed) * 0.012,
      Math.sin(angle) * localRadius
    );
    uvs.push(
      0.5 + (Math.cos(angle) * variation) / 2,
      0.5 + (Math.sin(angle) * variation) / 2
    );
  }

  for (let segment = 0; segment < segments; segment += 1) {
    const current = segment + 1;
    const next = ((segment + 1) % segments) + 1;
    indices.push(0, next, current);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createHangingIceSheetGeometry({
  width,
  thickness,
  drop,
  segments,
  seed
}) {
  const vertices = [];
  const uvs = [];
  const indices = [];
  const random = createSeededRandom(seed);

  for (let segment = 0; segment <= segments; segment += 1) {
    const t = segment / segments;
    const x = THREE.MathUtils.lerp(-width / 2, width / 2, t);
    const topWobble = (random() - 0.5) * thickness * 0.42;
    const bottomY = -drop * (0.68 + random() * 0.32) + Math.sin(t * Math.PI * 3 + seed) * drop * 0.08;
    const lowerWobble = (random() - 0.5) * thickness * 0.65;

    vertices.push(
      x, 0, -thickness / 2 + topWobble,
      x, 0, thickness / 2 + topWobble,
      x + (random() - 0.5) * width * 0.08, bottomY, -thickness / 2 + lowerWobble,
      x + (random() - 0.5) * width * 0.08, bottomY, thickness / 2 + lowerWobble
    );
    uvs.push(t, 0, t, 0, t, 1, t, 1);
  }

  for (let segment = 0; segment < segments; segment += 1) {
    const current = segment * 4;
    const next = current + 4;
    indices.push(
      current, current + 2, next,
      next, current + 2, next + 2,
      current + 1, next + 1, current + 3,
      next + 1, next + 3, current + 3,
      current, next, current + 1,
      next, next + 1, current + 1,
      current + 2, current + 3, next + 2,
      next + 2, current + 3, next + 3
    );
  }

  const first = 0;
  const last = segments * 4;
  indices.push(
    first, first + 1, first + 2,
    first + 1, first + 3, first + 2,
    last, last + 2, last + 1,
    last + 1, last + 2, last + 3
  );

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createCrackLineGeometry(radius, seed) {
  const random = createSeededRandom(seed + 901);
  const points = [];
  let x = (random() - 0.5) * radius * 0.55;
  let z = (random() - 0.5) * radius * 0.28;
  points.push(new THREE.Vector3(x, 0, z));

  for (let index = 0; index < 5; index += 1) {
    x += (random() - 0.5) * radius * 0.52;
    z += radius * alternatingSign(index) * (0.1 + random() * 0.2);
    points.push(new THREE.Vector3(x, 0, z));
  }

  return new THREE.BufferGeometry().setFromPoints(points);
}

function alternatingSign(index) {
  return index % 2 === 0 ? 1 : -1;
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
