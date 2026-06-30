# CryoRover - Technical Report and User Manual

## Introduction

CryoRover is an interactive real-time graphics project set in a remote icy cave. The player controls a scientific rover, explores the cave, scans glowing mineral targets, and collects sample fragments with a robotic arm mounted on the rover.

The project is designed for an Interactive Computer Graphics course. Its focus is not only visual appearance, but also the clear use of hierarchical modeling, local transformations, manual JavaScript animation, lighting, texture mapping, user interaction, and a coherent playable mission.

All models are built procedurally or from Three.js primitives. All animations are authored in JavaScript using transforms, object hierarchy, dynamic parenting, and `@tweenjs/tween.js` interpolation. No external animation clips are imported.

## Gameplay Objective and Difficulty

The player begins at the loading screen and then chooses Easy Mission or Hard Mission from a compact menu. During a mission, the player drives through the cave, locates mineral sample targets, scans them with `X`, and collects scanned samples with `E`. A sample counts toward the objective only after the robotic arm stores it in the rover inventory container.

The current repository configuration requires **2 stored samples**. The mission is won when the required number of samples is stored before the timer reaches zero. If the timer expires first, the game enters the Time Expired / Mission Failed state.

The difficulty settings are defined in `src/config/constants.js`:

| Mode | Required Samples | Timer | Scan Range | Collection Range | HUD Hints |
| --- | --- | --- | --- | --- | --- |
| Easy Mission | 2 | 360 seconds | 6.6 units | 4.2 units | Extended |
| Hard Mission | 2 | 210 seconds | 4.6 units | 3.1 units | Compact |

Easy Mission is more forgiving because it gives the player a longer timer, larger scan range, larger collection range, and more complete HUD hints. Hard Mission keeps the same objective count but uses stricter timing/ranges and a more compact HUD.

## Environment and Tools

- **Language:** JavaScript modules.
- **Rendering library:** Three.js.
- **Build tool:** Vite.
- **Animation helper:** `@tweenjs/tween.js`.
- **Camera interaction:** Three.js `OrbitControls`.
- **Rendering API:** WebGL through Three.js.
- **Styling:** CSS for full-screen canvas, menu, HUD, and result overlays.
- **Collision:** custom lightweight bounding-box checks using Three.js math classes.

The project does not use React, TypeScript, a physics engine, ray tracing, imported animation clips, downloaded models, or external texture packs.

## Scene and Theme

The scene represents a cold science-fiction ice cave. The environment is not an empty plane: it includes a shaped ground path, high cave walls, a ceiling, stalactites, stalagmites, ground-to-ceiling ice columns, emissive crystals, collectible sample fragments, fog, and glossy frozen patches.

The cave is organized as an explorable route with a wider start area, corridor sections, and a deeper chamber. Six sample target locations are distributed along the cave route. Each target pairs a glowing crystal with a smaller collectible fragment placed at a reachable pickup anchor.

The visual direction uses cool blue/cyan lighting, rough ice and rock surfaces, translucent-looking ice sheets, glowing minerals, and brighter rover elements so the mission remains readable during a presentation.

## Project Architecture

The code is split into small modules:

- `src/core/App.js`: scene setup, game loop, HUD, overlay flow, and system coordination.
- `src/core/Renderer.js`: WebGL renderer settings.
- `src/core/CameraManager.js`: Follow, Orbit, and Arm camera modes.
- `src/core/GameStateManager.js`: loading, menu, playing, pause, mission complete, and game over states.
- `src/world/IceCave.js`: procedural cave geometry, targets, samples, marker feedback, and environment animation.
- `src/world/Lights.js`: main cave lighting rig.
- `src/world/CollisionSystem.js`: lightweight bounding-box collision.
- `src/world/MaterialFactory.js` and `src/world/ProceduralTextures.js`: procedural material and texture setup.
- `src/rover/Rover.js`: rover hierarchy, headlights, scanner focus, inventory, and sample parenting.
- `src/rover/RoverArm.js`: articulated robotic arm hierarchy and arm poses.
- `src/rover/RoverAnimations.js`: wheel, rover body, mast, and antenna animation.
- `src/interaction/ScannerSystem.js`: target scanning sequence and scanner effects.
- `src/interaction/SampleCollectionSystem.js`: sample collection and inventory deposit sequence.
- `src/interaction/InputController.js`: keyboard input and edge-triggered actions.

## Hierarchical Models

### Rover

The rover is a procedural hierarchical model. Its root node is `RoverRoot`, which carries the moving body, wheel groups, camera mast, antenna, headlights, inventory container, and robotic arm.

Important rover hierarchy:

```text
RoverRoot
  Body
    SampleContainer
      CollectedSamples
      ContainerDropInsideAnchor
      ContainerDropHoverAnchor
      ContainerDoorRailGroup
        ContainerHatch
  WheelsGroup
  CameraMast
    CameraHead
  AntennaBase
    AntennaDish
  Headlights
  RoboticArmBase
```

The inventory container is parented to the rover body, so it inherits the rover's driving bob and tilt. The container hatch is a child of a rail group and slides locally along its X axis. This avoids the intersections that a rotating lid would create near the arm.

### Robotic Arm

The robotic arm is the main complex hierarchy. It is built from pivot groups and child meshes:

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
              GripperHoldAnchor
              GripperTipAnchor
```

The base rotates around local Y. The shoulder, elbow, and wrist rotate locally, moving all downstream child nodes. The claw groups are children of the gripper and open with mirrored local rotations. `GripperHoldAnchor` is centered between the claws and is used as the parent for a held sample. `GripperTipAnchor` marks the front reach point of the gripper.

This hierarchy is used directly in the scanner and collection animations. The arm does not use imported rigs or animation clips.

## Materials and Textures

The project uses PBR-style Three.js materials:

- `MeshStandardMaterial` for most rover, rock, wall, and formation surfaces.
- `MeshPhysicalMaterial` for glossier ice sheets, frozen puddles, crystals, and collectible samples.
- `MeshBasicMaterial` for additive scanner rings and beams.

Textures are generated procedurally in `src/world/ProceduralTextures.js` using CanvasTexture data. These procedural maps are deterministic and self-contained; there are no downloaded image assets or external texture licenses to track.

Material maps include:

- base-color maps for cave ice, ground, rock, rover metal, rover trim, crystals, and samples;
- normal maps for surface relief;
- roughness maps for matte and glossy variation;
- metalness maps for rover and trim materials;
- emissive maps for crystals and samples.

Glossy frozen puddles use a low-roughness `MeshPhysicalMaterial` with clearcoat and reflectivity-like material response. This is a lightweight reflection approximation, not a real mirror, planar reflection pass, ray tracing, or path tracing.

## Lighting and Atmosphere

The lighting rig is designed for a cold remote ice cave mood while keeping gameplay readable:

- hemisphere and ambient lights provide soft fill;
- one directional light adds stable shadows and shape;
- non-shadowed blue/cyan point lights create cave depth and route readability;
- selected landmark crystals and mission targets add local glow;
- rover headlights are functional `SpotLight` objects attached to the rover.

The rover headlights start off and can be toggled with `F`. They use a controlled cone angle, penumbra, and distance to brighten the cave ahead without flooding the whole scene. The spotlight objects stay resident at zero intensity when off, and their own shadow maps are disabled so toggling headlights does not trigger expensive runtime shadow setup. The visible headlight geometry is limited to the lenses; there are no solid beam meshes.

Fog is applied through the Three.js scene fog setting. It gives depth to the long cave and helps the far chamber fade into a cold atmosphere.

## Rendering Pipeline

Rendering is GPU-accelerated real-time rasterization through Three.js and WebGL. The scene is made from triangular meshes. Three.js transforms the meshes through the scene graph, rasterizes them on the GPU, samples material texture maps, evaluates lights/materials in shaders, and applies shadow maps for selected lights.

The renderer uses:

- antialiasing;
- ACES filmic tone mapping;
- sRGB output color space;
- soft shadow mapping;
- capped device pixel ratio for stable performance.

The project does not use real-time ray tracing. Reflections are approximated with material settings on glossy ice patches.

## Animations

All animations are manually implemented in JavaScript. The project animates transforms, material values, visibility, local hierarchy state, and object parenting. `@tweenjs/tween.js` is used where smooth interpolation and easing are useful.

Main animations include:

- wheel rotation while driving;
- rover body bob and subtle tilt while moving;
- camera mast idle motion;
- antenna oscillation;
- crystal and sample emissive pulsing;
- headlight fade and faint shimmer;
- camera mode transitions/snap behavior;
- robotic arm idle, ready, reach, scan, collection, lift, stow, and deposit poses;
- gripper open/close with mirrored claw rotations;
- scanner beam, endpoint glow, and expanding target ring;
- collection sequence with sample attachment to `GripperHoldAnchor`;
- visible sample fall into the container;
- sliding inventory hatch.

No external animation clips are imported.

## User Interaction

The player can drive the rover, change camera modes, toggle headlights, scan targets, collect samples, open the mission menu, and demonstrate arm poses.

The scanner is activated with `X`. It finds the nearest unscanned target, checks the mission profile scan range, aligns the rover toward the target, aims the camera mast and robotic arm, then emits a beam from the gripper area to the sample pickup anchor. Each target has independent scan state.

The collection system is activated with `E`. It prefers the nearest scanned and uncollected sample in range. The collection sequence locks movement temporarily, aligns the rover, opens the gripper, reaches the actual sample position, attaches the sample only when the hold anchor is close enough, lifts it, opens the sliding inventory hatch, releases the sample into the container, closes the hatch, and returns the arm to idle.

Scan and collection actions are mutually exclusive so tweens and hierarchy states do not overlap. Failed actions show short feedback such as `Move closer to scan.`, `Scan required.`, or `Move closer to collect.` and leave controls usable.

## Gameplay Loop

The game states are:

- `LOADING`: staged loading overlay and progress bar.
- `MENU`: mission selection with only Easy Mission, Hard Mission, and Restart Mission.
- `PLAYING`: rover controls, timer, HUD, scanner, collection, cameras, and lights are active.
- `PAUSED`: opened with `M`; timer and rover controls pause.
- `MISSION_COMPLETE`: shown after the required number of samples is stored.
- `GAME_OVER`: shown when time expires first.

Easy and Hard profiles use different timers and interaction distances. The HUD displays difficulty, timer, stored samples, current status message, camera mode, and compact controls. The final result overlay preserves the same three menu actions.

## Collision System

The collision system is intentionally lightweight. It uses bounding boxes and analytic cave boundaries rather than a physics engine. The rover checks its candidate position against:

- cave side boundaries;
- start and end boundaries;
- major crystal colliders;
- large stalagmites and ground formations;
- ground-to-ceiling columns and other registered obstacles.

If a full movement step is blocked, the rover attempts axis-separated movement, which lets it slide along valid directions. This is enough for stable navigation and avoids the complexity and unpredictability of a full rigid-body physics simulation.

Optional debug boxes can be toggled with `B`.

## Performance Notes

The project avoids expensive per-frame work:

- geometry and materials are created during setup, not inside update loops;
- procedural textures are shared;
- camera, scanner, rover, and target systems reuse temporary vectors;
- local point lights are limited to landmark crystals and mission targets;
- rover headlights toggle intensity instead of rebuilding or re-enabling light/shadow resources;
- collision exits early when an intersection is found;
- stored samples are hidden inside the storage group after the visible drop;
- renderer pixel ratio is capped for consistent browser performance.

The scanner and collection systems clean up their state after success or failure so controls are unlocked reliably.

## Limitations and Future Work

- The mission objective count is configurable in `src/config/constants.js`; the HUD shows the active required count.
- The project currently uses procedural meshes and materials rather than imported high-detail models.
- Glossy ice uses a lightweight material approximation rather than planar reflections or ray tracing.
- Optional future polish could include bloom, additional screenshots, a deployed GitHub Pages build, and more authored camera presentation shots.
- Physics simulation, ray tracing, imported animation clips, enemies, and large new gameplay systems are intentionally outside the current project scope.

## User Manual / Controls

| Input | Action |
| --- | --- |
| `W` / `S` | Move rover forward / backward |
| `A` / `D` | Rotate rover left / right |
| `F` | Toggle headlights |
| `C` | Cycle Follow, Orbit, and Arm camera modes |
| `X` | Scan nearest unscanned sample target when in range |
| `E` | Collect nearest scanned sample when in range |
| `M` | Open/close mission menu during gameplay |
| `R` | Reset rover position |
| `B` | Toggle collision debug boxes |
| `1` | Arm idle pose |
| `2` | Arm ready pose |
| `3` | Arm reach pose |
| `4` | Toggle gripper open/closed |
| `5` | Arm inspection sequence |

Mouse controls in Orbit camera mode:

- drag to orbit around the rover;
- mouse wheel to zoom in/out.

## Screenshots

Screenshot capture instructions are in [docs/screenshots/README.md](screenshots/README.md). The expected presentation screenshots are:

- `overview.png`: rover inside the cave;
- `scanner.png`: scanner effect aimed at a sample;
- `collection.png`: robotic arm collecting or depositing a sample;
- `menu.png`: optional clean menu screenshot.

## Credits and External Assets

All cave geometry, rover geometry, robotic arm geometry, samples, crystals, procedural texture maps, and animation sequences are generated or authored inside the project code.

External libraries:

- Three.js, MIT License;
- Vite, MIT License;
- `@tweenjs/tween.js`, MIT License.

No external texture packs, model files, or animation clips are used.
