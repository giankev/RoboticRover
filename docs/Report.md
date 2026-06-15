# CryoRover - Milestone 1 Report

## Project Idea

CryoRover is an interactive Europa ice cave explorer. The player pilots a small robotic rover through a frozen cave system, using headlights and a camera mast to inspect icy formations and glowing mineral crystals. The first milestone establishes the visual foundation, procedural rover, scene loop, and basic keyboard interaction.

## Technologies

- Vite for the local development server and build pipeline.
- JavaScript modules for application structure.
- Three.js for all 3D scene construction, rendering, lighting, camera work, and procedural geometry.
- @tweenjs/tween.js for lightweight JavaScript tween support.
- CSS for full-screen canvas presentation.
- A small custom collision system using `THREE.Box3` bounds, without a physics engine.

## Scene Hierarchy

Main scene:

```text
Scene
  CaveLights
  IceCave
    CollisionDebug
    FrostedGround
    ReadableSnowPath
    StartAreaPad/StartAreaRing
    LeftIceWall
    RightIceWall
    IceCeiling
    ChamberEndWall
    Stalagmites/Stalactites/GroundTouchingIceColumn_*
    EmissiveCrystal_* and CrystalGlow_*
    FutureSampleAreaPad/FutureSampleAreaRing
  RoverRoot
```

Rover hierarchy:

```text
RoverRoot
  Body
  WheelsGroup
  CameraMast
  AntennaBase
  Headlights
  SampleContainer
  RoboticArmBase
```

Robotic arm hierarchy:

```text
RoboticArmBase
  Shoulder
    UpperArm
      Elbow
        Forearm
          Wrist
            Gripper
              LeftClaw
              RightClaw
```

## Current Milestone

Milestone 1 includes a working Three.js scene with an expanded procedural icy cave, a procedurally built rover, a follow camera, keyboard controls, shadows, ACES tone mapping, sRGB output, default-off rover headlights, simple collision detection, optional collision debug visualization, and manual animation updates for wheel rotation, rover body motion, camera mast idle movement, antenna oscillation, and crystal pulsing.

The cave is now organized into a wider start area, a readable corridor, and a broad main chamber containing a clearly marked future sample area. The ground, side walls, ceiling, and end wall are generated procedurally with irregular geometry so the space reads more like an enclosed Europa cave.

Collision detection is handled by a lightweight custom system. The rover tests a `THREE.Box3` against analytic cave boundaries, segmented wall boundary boxes, and stored obstacle boxes before applying movement. Major visible ground obstacles and large crystals are registered from their visible meshes with extra padding, while ceiling-only objects do not block the rover. If a full movement step is blocked, the rover tries axis-separated movement to keep sliding along valid directions without using a physics engine. Pressing `B` toggles `Box3Helper` debug visualization for all registered colliders.

The headlights are two `SpotLight` objects attached to the rover's `Headlights` group. They start off by default. The `F` key uses edge-detected keydown handling to toggle their intensity, visibility, lens emission, and simple translucent beam cones with a short manual fade in the rover update loop. The global light balance keeps the cave readable when headlights are off, while the enabled headlights are noticeably brighter on the ground and walls ahead.

Deferred features for later milestones include scanner behavior, sample collection, textures, bloom, reflections, imported models, imported animations, and physics.
