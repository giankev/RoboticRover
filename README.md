# CryoRover - Interactive Europa Ice Cave Explorer

CryoRover is a Vite + JavaScript + Three.js prototype for exploring an icy cave on Europa with a procedural robotic rover.

## Install

```bash
npm install
```

If PowerShell blocks `npm`, use:

```bash
npm.cmd install
```

## Run

```bash
npm run dev
```

PowerShell fallback:

```bash
npm.cmd run dev
```

Then open the local URL shown by Vite.

## Build

```bash
npm run build
```

PowerShell fallback:

```bash
npm.cmd run build
```

## Controls

- `W` move forward
- `S` move backward
- `A` rotate left
- `D` rotate right
- `F` toggle headlights on/off
- `R` reset rover position
- `C` switch camera mode: Follow, Orbit, Arm
- `X` scan nearest target when in range
- `B` toggle collision debug boxes
- `1` animate robotic arm to idle pose
- `2` animate robotic arm to ready pose
- `3` animate robotic arm to reach pose
- `4` toggle gripper open/closed
- `5` play robotic arm inspection sequence

Orbit camera mouse controls:

- drag to rotate around the rover
- mouse wheel to zoom in/out

## Milestone 1

Implemented:

- Working Three.js scene
- WebGLRenderer with antialiasing, shadows, ACES tone mapping, and sRGB output
- Perspective follow camera
- Expanded procedural ice cave with a wider start area, corridor, broad main chamber, ceiling, irregular walls, stalactites, stalagmites, ground-touching ice columns, emissive crystals, and a readable future sample area
- Procedural rover and robotic arm hierarchy
- Functioning default-off rover headlights using two rover-mounted `SpotLight` objects, off-state lens materials, and visible light cones toggled with `F`
- Simple bounding-box collision detection for cave bounds, segmented wall boundaries, large crystals, stalagmites, and major ground-touching obstacles
- Optional `B` key collision debug visualization
- Manual JavaScript animations for wheels, rover body, camera mast, antenna, and crystals

## Milestone 2

Implemented:

- Refined procedural robotic arm hierarchy attached to the rover
- Local pivot groups for `RoboticArmBase`, `Shoulder`, `Elbow`, `Wrist`, `LeftClaw`, and `RightClaw`
- Upper arm and forearm meshes offset from their joint pivots so rotations demonstrate parent-child transforms clearly
- Manual tween-based arm poses: idle, ready, reach, gripper open, gripper close, and inspection sequence
- Keyboard test controls on `1`, `2`, `3`, `4`, and `5`

## Milestone 2.1

Implemented:

- Larger, more visible robotic arm mounted on the rover's top/front area
- Longer and thicker upper arm and forearm segments
- More distinct shoulder, elbow, wrist, and gripper geometry
- More pronounced idle, ready, reach, and inspection animation poses
- Three camera modes: Follow, Orbit, and Arm
- Mouse-controlled Orbit camera using Three.js `OrbitControls`
- Small on-screen status for current camera mode and arm state

## Milestone 3

Implemented:

- Scanner interaction on `X`
- Four scannable crystal targets near the future sample area
- Target states: `unscanned`, `scanning`, and `scanned`
- Successful scan feedback with rover movement pause, camera mast focus, translucent scan beam, expanding target ring, target glow boost, and scanned color change
- Failure feedback when too far away, with status text and camera-head warning shake
- On-screen scanner status text

Not implemented yet:

- Sample collection
- Dynamic sample parenting
- Inventory gameplay
- Advanced textures pipeline
- Bloom
- Reflections
- Physics engine
