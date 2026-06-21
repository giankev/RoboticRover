export const CAMERA = {
  fov: 58,
  near: 0.1,
  far: 260,
  followOffset: { x: 0, y: 4.4, z: 8.8 },
  lookAtOffset: { x: 0, y: 1.3, z: -2.2 },
  followLerp: 0.08,
  lookAtLerp: 0.12
};

export const WORLD = {
  caveMinZ: -210,
  caveMaxZ: 26,
  caveHeight: 24,
  groundSegmentsZ: 112,
  groundSegmentsX: 32,
  wallSegmentsZ: 96,
  wallSegmentsY: 18,
  ceilingSegmentsX: 32,
  crystalCount: 52,
  stalactiteCount: 38,
  stalagmiteCount: 52,
  pillarCount: 12,
  sampleArea: { x: 15, z: -150, radius: 8 }
};

export const ROVER = {
  moveSpeed: 7.8,
  turnSpeed: 1.65,
  wheelRadius: 0.36,
  startPosition: { x: 0, y: 0, z: 14 },
  collisionHalfSize: { x: 1.45, y: 1.85, z: 1.2 },
  headlightIntensity: 950,
  headlightDistance: 78,
  headlightAngle: 0.48
};

export const SCANNER = {
  range: 15,
  scanDuration: 1800,
  focusDuration: 420,
  failureDuration: 720
};

export const COLORS = {
  background: 0x030813,
  ice: 0x9bddef,
  deepIce: 0x1c4f70,
  rockIce: 0x27415a,
  compactSnow: 0xc9eef7,
  snow: 0xd7f7ff,
  roverBody: 0xd8e2e7,
  roverTrim: 0x283746,
  roverDark: 0x111820,
  amber: 0xffb347,
  crystalBlue: 0x61e8ff,
  crystalCyan: 0x8afff5,
  headlight: 0xdff8ff,
  scanner: 0x77f7ff,
  scannerScanned: 0xb7ff8a,
  scannerFailure: 0xff5c5c
};
