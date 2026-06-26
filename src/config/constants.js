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
  sampleArea: { x: 15, z: -150, radius: 8 },
  sampleTargets: [
    { x: -2.8, z: -24, pickupDirection: { x: -1, z: 0 } },
    { x: 2.6, z: -58, pickupDirection: { x: 1, z: 0 } },
    { x: -3.5, z: -94, pickupDirection: { x: -1, z: 0 } },
    { x: 3.8, z: -126, pickupDirection: { x: 1, z: 0 } },
    { x: -3.4, z: -162, pickupDirection: { x: -1, z: 0 } },
    { x: 2.9, z: -194, pickupDirection: { x: 1, z: 0 } }
  ]
};

export const ROVER = {
  moveSpeed: 7.8,
  turnSpeed: 1.65,
  wheelRadius: 0.36,
  startPosition: { x: 0, y: 0, z: 14 },
  collisionHalfSize: { x: 1.45, y: 1.85, z: 1.2 },
  headlightIntensity: 1200,
  headlightDistance: 92,
  headlightAngle: 0.38,
  headlightPenumbra: 0.38,
  headlightDecay: 1.2
};

export const SCANNER = {
  interactionDistance: 5.25,
  alignDuration: 640,
  scanDuration: 1800,
  focusDuration: 420,
  failureDuration: 720
};

export const COLLECTION = {
  interactionDistance: 3.4,
  alignDuration: 680,
  readyDuration: 720,
  reachDuration: 940,
  liftDuration: 760,
  stowDuration: 440,
  dropDuration: 460,
  doorDuration: 280,
  releaseGripperDuration: 140,
  fallDuration: 210,
  returnDuration: 440,
  grabDistance: 0.16,
  dropDistance: 0.18
};

export const GAME_STATES = Object.freeze({
  LOADING: 'LOADING',
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  MISSION_COMPLETE: 'MISSION_COMPLETE',
  GAME_OVER: 'GAME_OVER'
});

export const MISSION = Object.freeze({
  // Debug target: restore this to 6 for the final six-sample mission.
  requiredSamples: 2
});

export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({
    id: 'easy',
    label: 'Easy Mission',
    requiredSamples: MISSION.requiredSamples,
    timeLimitSeconds: 360,
    scanDistance: 6.6,
    collectionDistance: 4.2,
    showExtendedHints: true
  }),
  hard: Object.freeze({
    id: 'hard',
    label: 'Hard Mission',
    requiredSamples: MISSION.requiredSamples,
    timeLimitSeconds: 210,
    scanDistance: 4.6,
    collectionDistance: 3.1,
    showExtendedHints: false
  })
});

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
