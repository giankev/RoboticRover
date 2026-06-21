# CryoRover - Milestone 3 Report

## Project Idea

CryoRover is an interactive Europa ice cave explorer. The player pilots a small robotic rover through a frozen cave system, using headlights and a camera mast to inspect icy formations and glowing mineral crystals. The first milestone establishes the visual foundation, procedural rover, scene loop, and basic keyboard interaction. Milestone 2 focuses on the rover's robotic arm as a clear hierarchical model with local pivots and manual JavaScript animation. Milestone 2.1 improves arm readability and adds camera modes for presenting the hierarchy and animations. Milestone 3 adds an interactive scanner for nearby cave targets.

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

Milestone 3 keeps the Milestone 1 and Milestone 2 systems intact and adds scanner interaction. The app still includes the expanded procedural icy cave, procedural rover, keyboard controls, shadows, ACES tone mapping, sRGB output, default-off rover headlights, simple collision detection, optional collision debug visualization, camera modes, robotic arm controls, and manual animation updates for wheel rotation, rover body motion, camera mast idle movement, antenna oscillation, and crystal pulsing.

The cave is now organized into a wider start area, a readable corridor, and a broad main chamber containing a clearly marked future sample area. The ground, side walls, ceiling, and end wall are generated procedurally with irregular geometry so the space reads more like an enclosed Europa cave.

Collision detection is handled by a lightweight custom system. The rover tests a `THREE.Box3` against analytic cave boundaries, segmented wall boundary boxes, and stored obstacle boxes before applying movement. Major visible ground obstacles and large crystals are registered from their visible meshes with extra padding, while ceiling-only objects do not block the rover. If a full movement step is blocked, the rover tries axis-separated movement to keep sliding along valid directions without using a physics engine. Pressing `B` toggles `Box3Helper` debug visualization for all registered colliders.

The headlights are two `SpotLight` objects attached to the rover's `Headlights` group. They start off by default. The `F` key uses edge-detected keydown handling to toggle their intensity, visibility, lens emission, and simple translucent beam cones with a short manual fade in the rover update loop. The global light balance keeps the cave readable when headlights are off, while the enabled headlights are noticeably brighter on the ground and walls ahead.

## Robotic Arm Hierarchy

The arm is built procedurally from Three.js primitives and remains a child of `RoverRoot`, so it moves and rotates with the rover. The logical hierarchy is:

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

`RoboticArmBase`, `Shoulder`, `Elbow`, `Wrist`, `LeftClaw`, and `RightClaw` are `THREE.Group` pivot nodes. The base rotates around the local vertical Y axis. The shoulder, elbow, and wrist rotate locally to pitch the arm in its own articulated chain. The upper arm and forearm cylinder meshes are offset along the local X axis from their parent joint groups, so rotating the joint moves the whole downstream chain instead of spinning a mesh around its center.

The gripper is also hierarchical. `LeftClaw` and `RightClaw` are separate child groups under `Gripper`; each claw mesh is offset from its claw pivot, and the claw rotations are mirrored so the jaws open and close symmetrically.

Milestone 2.1 scales the arm up for readability from the default camera. The base is mounted on the rover's top/front area, the upper arm and forearm are longer and thicker, and the shoulder, elbow, wrist, and gripper include larger joint and axle geometry so each pivot is easy to identify during a presentation.

## Arm Animation

The arm exposes these public methods: `setIdlePose()`, `animateToIdle()`, `animateToReady()`, `animateToReach()`, `openGripper()`, `closeGripper()`, `playInspectionSequence()`, and `update(delta)`.

All poses are manual JavaScript targets made from local joint rotations:

- idle pose: folded side pose for driving;
- ready pose: raised inspection pose;
- reach pose: extended forward/outward pose with open gripper;
- gripper open/close: mirrored claw rotation;
- inspection sequence: base turns outward, shoulder raises, elbow bends, wrist tilts, gripper opens, gripper closes, then the arm returns to idle.

Smooth motion is implemented with `@tweenjs/tween.js` by interpolating the arm's local pose state and applying it back to the pivot groups each frame. Milestone 2.1 increases the separation between idle, ready, reach, and inspection poses and uses slightly longer tween durations so the motion reads clearly and does not snap unrealistically. No imported animation clips, rigs, physics engine, scanner behavior, or sample parenting are used in this milestone.

## Camera Modes

The `CameraManager` now supports three camera modes, switched with `C`:

- Follow: the original third-person driving camera behind and above the rover.
- Orbit: a mouse-controlled `OrbitControls` camera centered on the rover. Drag rotates around the rover, and the mouse wheel zooms. The orbit target follows the rover position as it drives.
- Arm: a close camera aimed at the robotic arm and gripper area for demonstrating the hierarchy and animations.

A small status overlay displays `Camera: Follow / Orbit / Arm`, `Arm: Idle / Ready / Reach / Inspecting`, and scanner messages such as `Scanner: Ready`, `Scanner: Move closer to scan`, or `Scanner: Target scanned`. The overlay is informational only; it does not change rover controls.

## Scanner Interaction

Milestone 3 adds four scannable crystal targets near the future sample area. Each target stores a scanner state:

- `unscanned`: the target can be scanned and shows a subtle cyan marker ring.
- `scanning`: the rover is actively scanning the target.
- `scanned`: the target changes to a green scanned color and keeps a stronger glow.

Pressing `X` asks the `ScannerSystem` to find the nearest unscanned target. If the target is inside the configurable scan range, the rover temporarily stops moving while the scan plays. The camera mast and camera head rotate toward the target, a narrow translucent additive scan beam connects the rover camera lens to the target, and an expanding ring pulse appears around the target. The target emissive intensity is boosted during the scan. When the tween sequence completes, the target state changes to `scanned` and the UI reports `Scanner: Target scanned`.

If no unscanned target is close enough, the target state is not changed. The UI reports `Scanner: Move closer to scan`, and the rover camera head performs a short warning shake with a red scanner LED flash. This is a lightweight interaction feedback animation only; no physics engine or inventory system is involved.

The scanner animation is fully manual JavaScript. It uses object transforms, material opacity, emissive intensity, and `@tweenjs/tween.js` interpolation. No imported animation clips are used.

## Milestone 2.1 Controls

- `1`: animate arm to idle pose.
- `2`: animate arm to ready pose.
- `3`: animate arm to reach pose.
- `4`: toggle the gripper open or closed.
- `5`: play the inspection animation sequence.
- `C`: cycle Follow, Orbit, and Arm camera modes.
- `X`: scan the nearest unscanned target if it is in range.

Deferred features for later milestones include sample collection, dynamic gripper/sample parenting, inventory gameplay, textures, bloom, reflections, imported models, imported animations, and physics.
