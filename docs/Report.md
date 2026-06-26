# CryoRover — Milestones 5–6.1 Report

## Project Idea

CryoRover is an interactive Europa ice cave explorer. The player pilots a small robotic rover through a frozen cave system, using headlights, a camera mast, and a robotic arm to inspect icy formations, scan glowing mineral targets, and collect a scanned sample fragment. The current Milestone 5 debug target is two deposited samples, while six independent targets remain distributed along the cave route for full-mission testing.

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
    ScannerTargetRing_*
    CollectibleSample_*
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
    CollectedSamples
    ContainerDropInsideAnchor
    ContainerDropHoverAnchor
    ContainerDoorRailGroup
      ContainerHatch
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
              GripperHoldAnchor
              GripperTipAnchor
```

## Current Milestone

Milestone 5 preserves the cave, procedural rover, keyboard controls, shadows, headlights, collision system, camera modes, robotic-arm hierarchy, scanner states, and physical-looking collection sequence from the earlier milestones. It adds a clear game-state layer, difficulty configuration, timed objective, playable HUD, and win/loss flow around those existing systems.

The cave is organized into a wider start area, a readable corridor, and a broad main chamber. Six mission targets are distributed along this route rather than concentrated in one sample area. The ground, side walls, ceiling, and end wall are generated procedurally with irregular geometry so the space reads more like an enclosed Europa cave.

Collision detection is handled by a lightweight custom system. The rover tests a `THREE.Box3` against analytic cave boundaries, segmented wall boundary boxes, and stored obstacle boxes before applying movement. Major visible ground obstacles and large crystals are registered from their visible meshes with extra padding, while ceiling-only objects do not block the rover. If a full movement step is blocked, the rover tries axis-separated movement to keep sliding along valid directions without using a physics engine. Pressing `B` toggles `Box3Helper` debug visualization for all registered colliders.

The headlights are two `SpotLight` objects attached to the rover's `Headlights` group. They start off by default. The `F` key uses edge-detected keydown handling to fade their intensity, visibility, and lens emission in the rover update loop. Their range, cone angle, penumbra, and aim are tuned for a strong but contained pool of light on the floor and walls ahead; the former beam-cone geometry was removed so the rover does not project two visible solid cones.

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

The gripper is also hierarchical. `LeftClaw` and `RightClaw` are separate child groups under `Gripper`; each claw mesh is offset from its claw pivot, and the claw rotations are mirrored so the jaws open and close symmetrically. Two internal child anchors support interaction: `GripperHoldAnchor` is centered between the claws for carrying samples, while `GripperTipAnchor` marks the physical reach point at the claw tips.

Milestone 2.1 scales the arm up for readability from the default camera. The base is mounted on the rover's top/front area, the upper arm and forearm are longer and thicker, and the shoulder, elbow, wrist, and gripper include larger joint and axle geometry so each pivot is easy to identify during a presentation.

## Arm Animation

The arm exposes these public methods: `setIdlePose()`, `animateToIdle()`, `animateToReady()`, `animateToReach()`, `openGripper()`, `closeGripper()`, `playInspectionSequence()`, `animateToScanPose(worldPosition)`, `returnFromScan()`, `playScanFailure(duration)`, `animateToCollectionReady(worldPosition)`, `animateToCollectionGrab(worldPosition)`, `animateToCollectionLift(worldPosition)`, `animateToContainerStow()`, `animateToContainerDrop()`, `getScannerOrigin(target)`, and `update(delta)`.

All poses are manual JavaScript targets made from local joint rotations:

- idle pose: folded side pose for driving;
- ready pose: raised inspection pose;
- reach pose: extended forward/outward pose with open gripper;
- gripper open/close: mirrored claw rotation;
- inspection sequence: base turns outward, shoulder raises, elbow bends, wrist tilts, gripper opens, gripper closes, then the arm returns to idle.
- scanner pose: base yaw aims toward the target, shoulder/elbow/wrist move into a clear inspection posture, and the gripper opens slightly as the scan emitter.
- collection poses: target-facing ready, grab, and lift poses, followed by container-facing stow and drop poses.

Smooth motion is implemented with `@tweenjs/tween.js` by interpolating the arm's local pose state and applying it back to the pivot groups each frame. The scan pose uses a target-facing predefined configuration. The final collection approach converts the sample world position into the arm's local plane and uses a small analytic two-link solve to place `GripperHoldAnchor` at the sample before attachment. The inventory hatch uses an independent local-position tween rather than a hinge rotation. No imported animation clips, rigs, physics engine, or pathfinding are used in this milestone.

## Camera Modes

`CameraManager` supports three camera modes, switched with `C` while a mission is playing:

- Follow: the original third-person driving camera behind and above the rover.
- Orbit: a mouse-controlled `OrbitControls` camera centered on the rover. Drag rotates around the rover, and the mouse wheel zooms. The orbit target follows the rover position as it drives.
- Arm: a close camera aimed at the robotic arm and gripper area for demonstrating the hierarchy and animations.

The compact gameplay HUD displays the selected difficulty, time, deposited samples, short scanner/collection status, camera mode, and a controls reminder. It is informational only and does not change rover controls.

## Visual Polish: Materials, Textures, And Lighting

Milestone 6 adds a small self-contained procedural texture library in `src/world/ProceduralTextures.js`. It generates deterministic 128×128 `CanvasTexture` maps at startup, so the project has no downloaded texture dependency and real CC0 image textures can later replace the same map slots without redesigning the materials. The library is shared by all scene systems rather than regenerated per mesh.

The material system uses PBR-style `MeshStandardMaterial` and `MeshPhysicalMaterial` properties with these map types:

- base-color maps for cave ice, frosted ground, rock, rover metal, trim, crystals, and mineral fragments;
- normal maps for small surface relief on cave surfaces, metal panels, crystals, samples, wheels, and arm parts;
- roughness maps to separate glossy ice/crystal surfaces from matte rock and tire surfaces;
- metalness maps on rover body, panel, trim, container, hub, and arm materials;
- emissive maps for crystals and collectible mineral fragments, preserving their readable scan/collection glow.

The ground, side-wall, and ceiling procedural geometries now include UV coordinates, so their repeating texture maps visibly span the cave rather than sampling a single texel. Ice uses cooler, smoother Physical-material response and restrained clearcoat; ground and rock are deliberately rougher; rover materials use brushed metal texture detail; crystals remain clearcoated and emissive; and samples use a separate teal-green collectible material.

Milestone 6.1 rebuilds the visible cave forms instead of relying on default cone placeholders. Stalactites and stalagmites are custom indexed `BufferGeometry` meshes with irregular tapered rings, non-uniform facet radii, pointed tips, varied height/radius/rotation, and nearby secondary shards. Ground-touching columns use the same generated geometry with layered ice bands, so they look grown from ice strata instead of like uniform cylinders. The ceiling is now a strongly ridged arch rather than a flat cover, with ceiling-parented irregular hanging ice sheets, darker rock/ice bands, and stalactites positioned from the actual roof surface. These formations overlap the upper wall region to make the player read the environment as an enclosed cave, while their 0.8–2.9-unit drops preserve safe rover and camera clearance. Translucent irregular floor sheets and restrained crack lines break up the driving surface. The cave remains a cold, crystalline volume, with darker rock material appearing selectively among the lighter ice formations.

`src/world/MaterialFactory.js` now centralizes cave PBR materials, while `src/world/ProceduralTextures.js` owns the shared deterministic CanvasTexture map generation. These are procedural textures, not external assets: no downloaded image license applies. The maps use `RepeatWrapping`, map-specific repeat values, mipmaps, and up to 4× renderer-supported anisotropic filtering to avoid a single stretched or blurry cave texture. Existing material slots remain conventional (`map`, `normalMap`, `roughnessMap`, `metalnessMap`, and `emissiveMap`), so a later CC0 texture pack can replace the generated maps without changing scene logic.

The new large ice formation groups continue to register their collision bounds from their visible geometry. This keeps the existing lightweight `Box3` collision system aligned with substantial stalagmites and columns, while hanging ceiling formations remain visual-only and do not unexpectedly block rover movement.

Lighting keeps the cold Europa mood while maintaining navigation clarity. The rig combines a sky/ground hemisphere light, low ambient fill, a shadow-casting directional ice shaft, start/chamber/corridor/deep-cave blue point-light fills, selected landmark crystal glows, and the rover's functional SpotLight headlights. Renderer settings retain soft shadow mapping and ACES filmic tone mapping, with a modest exposure lift and blue distance fog. Four small visual-only frozen patches use one low-roughness, high-reflectivity `MeshPhysicalMaterial` with clearcoat, normal-map variation, and direct-light highlights to suggest glossy ice. This is a lightweight real-time reflection approximation, not a `Reflector`, dynamic rover reflection, or ray-tracing effect, and the patches do not register collision volumes.

### GPU Rendering Note

Three.js renders this project through GPU-accelerated WebGL. The renderer uses the conventional real-time rasterization pipeline: meshes are transformed and rasterized into pixels, texture maps are sampled in material shaders, PBR-style lighting is evaluated per rendered surface, and shadow maps approximate occlusion from the directional light and rover headlights. Glossy frozen-patch highlights are a material-based reflection approximation. The project does **not** use real-time ray tracing. All rover, scanner, arm, collection, and environmental animations remain manual JavaScript transform/material updates; no external animation clips are imported.

## Milestone 7: Lighting, Atmosphere, UI, And Performance

The final lighting pass keeps the cave cold but navigable. A cool hemisphere light and restrained ambient fill preserve detail in dark ice, while one shadow-casting directional “ice shaft” gives the rover and major formations stable shape. Non-shadow-casting start, corridor, chamber, and deep-cave point lights provide only broad navigational fill. Rover headlights remain functional `SpotLight` objects with visible lenses only: their intensity and distance are moderately increased, while the angle and penumbra create a controlled forward pool without brightening the whole cave. Their shadow maps are 512×512, while the single directional shadow map uses 1024×1024. This keeps useful contact shadows without paying for many high-resolution shadow passes.

Crystals retain their emissive PBR material response, but only landmark crystals and mission-target crystals own local point lights. This avoids assigning a dynamic light to every decorative crystal while preserving readable bright landmarks, scan feedback, and collectible samples. The scene background, blue linear fog, and ACES filmic exposure are tuned together: fog begins beyond the immediate driving area and deepens down the cave rather than obscuring nearby gameplay.

The gameplay HUD now presents only the selected difficulty, timer, samples, short status, camera mode, and one compact controls line. Loading remains title, **Map loading...**, and a progress bar only; menu, pause, and result overlays retain the same Easy Mission / Hard Mission / Restart Mission actions without duplicate control lists or extra buttons.

Performance work avoids geometry and material construction in the animation loop. The renderer caps device pixel ratio at 1.75 and no longer requests a preserved drawing buffer. Camera and rover interaction paths reuse `Vector3` scratch objects; the final deposit stores its already-hidden sample directly instead of performing a costly world-transform-preserving attach; and the collision loop returns on its first intersection. During collection, the raised pre-drop arm tween and hatch-open tween run together because that pose remains outside the tray; the arm then reaches the drop anchor, opens, releases the sample through the short fall tween, retracts, closes the hatch, and returns idle. No `setTimeout`, geometry rebuild, or material/light allocation is performed during that sequence. Scanner and collection interactions remain mutually exclusive and their tween/state-machine cleanup releases control locks even when a sequence is interrupted.

### Rendering Summary

The project is built from triangular meshes and rendered by GPU-accelerated WebGL through Three.js. It uses real-time rasterization, texture mapping, PBR-style materials, shadow mapping, emissive effects, and material-based glossy reflection approximations. It does **not** use ray tracing, a physics engine, imported animations, or heavy post-processing.

## Scanner Interaction And State

Six scannable crystal targets are distributed from the entrance corridor to the deep chamber. Each target stores a scanner state:

- `unscanned`: the target can be scanned and shows a subtle cyan marker ring.
- `scanning`: the rover is actively scanning the target.
- `scanned`: the target changes to a green scanned color and keeps a stronger glow.

Pressing `X` asks the `ScannerSystem` to find the nearest unscanned target. For sample targets, the scanner uses the same `SamplePickupAnchor` used by collection rather than the center of the larger crystal mesh. Its interaction range is selected by the mission profile: 6.6 world units on Easy and 4.6 on Hard. If the target is inside that configurable interaction distance, the rover temporarily stops moving while the scan plays. Manual arm demo keys `1` through `5` are ignored until the automatic scan sequence finishes, which prevents overlapping arm tweens.

Before the camera and arm scan animation begins, the target world position is compared with `RoverRoot.position` on the XZ plane. The rover computes a target yaw with `atan2(-dx, -dz)`, where `dx` and `dz` are the horizontal offsets from rover to target. It then normalizes the yaw difference to the shortest turn and tweens `RoverRoot.rotation.y` in place. The rover does not drive toward the target or perform pathfinding; if the target is outside the selected scanner range, the alignment step is skipped and the scan fails.

The successful scan sequence is:

1. Pause rover movement and report `Scanner: Aligning target`.
2. Rotate `RoverRoot` in place until the rover faces the selected target.
3. Set the target to `scanning`.
4. Rotate the camera mast and camera head toward the target.
5. Animate the robotic arm from its current pose into a ready pose.
6. Aim `RoboticArmBase` toward the target using a clamped procedural yaw.
7. Move `Shoulder`, `Elbow`, and `Wrist` into the scan pose and open the gripper slightly.
8. Emit a narrow translucent additive beam from the gripper area to the target and expand a scanner ring at the target.
9. Boost the target crystal's emissive intensity while the scan pulse runs.
10. Mark the target as `scanned`, change it to the scanned color, report `Scanner: Target scanned`, and return the camera and arm to idle.

If no unscanned target is close enough, the target state is not changed. The UI reports `Scanner: Move closer to scan`, and the rover camera head performs a short warning shake with a red scanner LED flash. The rover does not rotate, the arm does not move, and the scan beam/ring effect is not started. This is a lightweight interaction feedback animation only; no physics engine or inventory system is involved.

The scanner animation is fully manual JavaScript. It uses object transforms, material opacity, emissive intensity, hierarchy-based arm rotations, rover yaw alignment, and `@tweenjs/tween.js` interpolation. The beam is positioned every frame between the gripper-derived scanner origin and the selected target's current world position. For collectible targets that world position is the sample pickup anchor, so the scan and collect controls refer to the same logical sample state. No imported animation clips are used.

## Sample Collection

Each of the six mission targets has a small collectible sample fragment beside it. The targets use configured cave-space coordinates and a deliberate outward pickup direction; initialization checks a rover-sized approach point against existing colliders and shifts the target locally when needed. This keeps fragments clear of walls, existing obstacles, and their own crystal collider while retaining a reachable pickup anchor.

Each sample stores independent state:

- `id`: stable identifier such as `sample-1`.
- `mesh`: the visible faceted fragment mesh.
- `scanned`: whether its associated target has been scanned.
- `collected`: whether this specific sample has been deposited.
- `pickupAnchor`: an internal `Object3D` placed outside the large crystal collider on an accessible side of the crystal.
- `anchorPosition`: the original cave-space pickup position used as a fallback for range checks even after the sample mesh is reparented.

The collection state is stored per sample and mirrored to the target object for UI/debug readability:

- `uncollected`: the sample has not been picked up.
- `collecting`: the arm sequence is currently manipulating the sample.
- `collected`: the sample has been deposited in the rover container.

Pressing `E` asks the `SampleCollectionSystem` to find a nearby sample target. Collection range is selected by the mission profile (4.2 units on Easy and 3.1 units on Hard), so the rover must be close enough for the arm motion to look believable. Distance is measured against each sample's `pickupAnchor`, not against the large crystal center or the sample mesh's current parented position, so a deposited sample in the rover container cannot block collection of another sample. The selection prefers the nearest scanned and uncollected sample in range before considering unscanned samples, which keeps `E` paired with the target just scanned by `X`. If no sample is close enough, the UI reports `Move closer to collect`. If a nearby uncollected sample is not scanned, the UI reports `Scan required`. If nearby samples are already collected and no uncollected sample is in range, the UI reports `Sample already collected`.

The successful collection sequence is:

1. Lock rover movement and manual arm controls.
2. Temporarily switch to the Arm camera mode.
3. Rotate `RoverRoot` in place toward the sample using the same XZ-plane yaw alignment as the scanner.
4. Move the arm to a target-facing ready pose.
5. Open the gripper and make a final arm approach that places `GripperHoldAnchor` at the sample world position.
6. Measure the world-space distance from `GripperHoldAnchor` to the sample. If the hold anchor is not close enough, report `Collection: Move closer to collect` and do not attach the sample.
7. Close the gripper around the sample and reparent it to `GripperHoldAnchor` with `Object3D.attach()`, preserving its world transform so no visible snap occurs.
8. Lift the sample with the arm hierarchy. The sample now moves only because it is a child of the gripper hold anchor.
9. Move to a raised pre-drop pose that stays clear of the inventory hatch path.
10. Slide `ContainerHatch` sideways along the container's local X axis until the door is fully open.
11. Move the gripper to `ContainerDropHoverAnchor` above the opening and measure the `GripperHoldAnchor` distance. The sample is released only if the gripper is aligned with this safe hover point.
12. Open the gripper, detach the sample from `GripperHoldAnchor` into the container hierarchy with its world transform preserved, and keep it visible.
13. Tween the released sample from that world-preserved release position down to `ContainerDropInsideAnchor` over 260ms using quadratic-in easing.
14. Only after the short 260ms fall tween completes, reparent the sample to `CollectedSamples`, hide it, and mark it as collected.
15. Retract the gripper to the raised pre-drop pose, then slide the hatch closed only after the arm is clear.
16. Return the arm to idle, restore the previous camera mode, and report `Collection: Sample collected`.

This sequence demonstrates dynamic parenting: before collection the sample belongs to the cave hierarchy, during transport it belongs to the gripper hold anchor, and at release it is attached to the container hierarchy while preserving its world transform. A short local-position tween then visibly carries the released sample down into the tray. The sample is never tweened from the ground to the gripper.

The `GripperHoldAnchor` is an internal `Object3D` centered between the two claws and is used both as the carried-sample parent and the container-hover distance check. The `GripperTipAnchor` marks the physical reach point at the claw tips. Both anchors follow all parent transforms from `RoboticArmBase`, `Shoulder`, `Elbow`, `Wrist`, and `Gripper`. `SampleContainer` is parented to the animated `Body`, so its tray, door, anchors, and deposited samples inherit the driving bob and tilt. The tray has a visible floor, four walls, and narrow rim rails that leave a real open top. `ContainerDropInsideAnchor` is centered inside the tray as the fall/storage target, while `ContainerDropHoverAnchor` is above the rim and is the only target reached by the gripper during deposit. At release, the sample is attached to `SampleContainer` with its world transform preserved, visibly tweened to the inside anchor, then hidden in `CollectedSamples`. `ContainerHatch` is parented under a stationary `ContainerDoorRailGroup`; its tween changes only local X from `(0, 0.39, 0)` to `(-0.84, 0.39, 0)`, preserving its local Y and Z exactly.

## Gameplay Loop And Game States

`GameStateManager` owns the top-level mission state and is deliberately separate from scanner and collection logic. It uses the following states:

- `LOADING`: a staged initialization sequence shows **CryoRover — Europa Ice Cave Explorer**, the text **Map loading...**, and a visible 0–100% progress bar for a little over one second. The scene can render behind the overlay, but all input is disabled.
- `MENU`: the player sees only Easy Mission, Hard Mission, and Restart Mission. Restart is disabled until a profile has been selected; the rover remains inactive until a mission starts.
- `PLAYING`: the countdown starts, the HUD becomes visible, and the existing rover, camera, headlights, scanner, collision, robotic-arm, and collection controls are enabled.
- `PAUSED`: the `M` key opens the same three-action overlay, pauses the timer, and disables rover and Orbit camera controls. `M` again returns to `PLAYING`; Easy or Hard starts that profile afresh, while Restart Mission keeps the selected profile.
- `MISSION_COMPLETE`: triggered when the configurable required-sample count has been deposited in the inventory. The result overlay reports the samples secured and remaining time.
- `GAME_OVER`: triggered when the countdown reaches zero before the configured required-sample count is recorded. The result overlay reports progress.

The loading and result screens disable keyboard input and OrbitControls through the same application-level gate, so no rover movement, arm demo, scanner, collection, reset, lights, collision debug, or camera-mode actions can run outside `PLAYING`. The loading screen remains separate and shows only the title, **Map loading...**, and its progress bar. All non-loading overlays reuse the same three choices: **Easy Mission**, **Hard Mission**, and **Restart Mission**—there are no separate Resume or Change Difficulty buttons.

## Difficulty Configuration

Difficulty values are centralized in `src/config/constants.js`. `MISSION.requiredSamples` is deliberately set to `2` for quick collection debugging; change that one value back to `6` for the final objective. Both profiles currently reference this shared required-sample setting:

- Easy Mission: 360 seconds, 6.6-unit scanner range, 4.2-unit collection range, and expanded HUD hints.
- Hard Mission: 210 seconds, 4.6-unit scanner range, 3.1-unit collection range, and compact HUD hints.

When a profile is selected, the application passes its scan range to `ScannerSystem` and collection range to `SampleCollectionSystem`. The systems retain their own selection, target-state, physical reach, gripper attachment, inventory-door, and deposit logic; only their configurable range threshold changes. The timer updates only in `PLAYING`. It checks the deposited sample count before reducing time for the frame, so a sample recorded by the inventory deposit step can complete the mission immediately. Otherwise, reaching zero produces `GAME_OVER`.

## Mission Interaction

The mission loop intentionally layers over the prior interactions rather than replacing them:

1. Drive through the cave route to a distributed sample target.
2. Press `X` near an unscanned sample target. The scanner auto-aligns the rover, aims the mast and robotic arm, runs the beam/ring effect, and marks only that target as scanned.
3. Press `E` near the scanned sample. The arm reaches the real sample position, closes the gripper, carries the sample through the sliding-hatch sequence, and deposits it in the rover inventory.
4. The counter increments only after the visible fall into the inventory has completed and the sample state becomes `collected`.
5. During debugging, collect two samples until the HUD reaches `Samples: 2 / 2`; restore `MISSION.requiredSamples` to six for the final mission.

The HUD reports the selected difficulty, time remaining, deposited/required samples, current scanner or collection status, camera mode, and basic controls. Easy Mission includes extra camera/headlight hints, while Hard Mission retains only the core driving, scanning, collection, and pause reminder. A terminal result is queued after its condition is decided but is shown only after any active scanner or collection sequence has fully cleaned up, so the final fall, arm retraction, and sliding-door close remain smooth and visible. The final-release gripper tween is 160ms, the visible sample fall is 260ms, and the return-to-idle tween is 520ms—there are no timeout chains or blocking work in this deposit tail. Result overlays keep the same compact Easy / Hard / Restart mission actions.

## Controls

- `W` / `S`: drive forward / backward.
- `A` / `D`: rotate left / right.
- `F`: toggle headlights.
- `R`: reset rover position.
- `C`: cycle Follow, Orbit, and Arm camera modes.
- `X`: scan the nearest unscanned sample target when in range.
- `E`: collect the nearest scanned sample when in range.
- `M`: pause/resume the mission menu when no scanner or collection sequence is active.
- `B`: toggle optional collision helpers.
- `1`–`5`: demonstrate the existing robotic-arm poses, gripper, and inspection sequence.

These controls apply only while a mission is playing. In Orbit mode, mouse drag rotates around the rover and the wheel changes distance.

Deferred features for later milestones include optional bloom, full planar reflections, imported models, imported animations, physics, and complex pathfinding. The current procedural PBR texture system is already in place.
