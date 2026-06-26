# CryoRover - Interactive Europa Ice Cave Explorer

CryoRover is a Vite + JavaScript + Three.js mission game for exploring an icy cave on Europa with a procedural robotic rover. Scan minerals and deposit their samples before the mission timer runs out.

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

The title loading screen displays a staged 0–100% progress bar for just over one second, then opens the difficulty menu. Choose a difficulty before rover controls become active. Controls are disabled during loading, menus, pause, and mission-result screens.

- `W` move forward
- `S` move backward
- `A` rotate left
- `D` rotate right
- `F` toggle headlights on/off
- `R` reset rover position
- `C` switch camera mode: Follow, Orbit, Arm
- `X` trigger an arm-assisted scan on the nearest target when in range
- `E` collect a scanned sample when close enough
- `B` toggle collision debug boxes
- `1` animate robotic arm to idle pose
- `2` animate robotic arm to ready pose
- `3` animate robotic arm to reach pose
- `4` toggle gripper open/closed
- `5` play robotic arm inspection sequence
- `M` open/close the pause menu during a mission

## Mission and difficulty

The current debug objective is **two deposited samples**, configured as `MISSION.requiredSamples` in `src/config/constants.js`. Set it back to `6` for the final six-sample mission. Six independent sample targets remain distributed across the cave for exploration testing. A sample counts only after the robotic arm deposits it in the rover inventory. First use `X` to scan a nearby mineral, then use `E` while close enough to collect its fragment.

- **Easy Mission**: 2 samples (debug setting), 6:00 timer, 6.6-unit scan range, 4.2-unit collection range, and expanded on-screen control hints.
- **Hard Mission**: 2 samples (debug setting), 3:30 timer, 4.6-unit scan range, 3.1-unit collection range, and compact hints.

The menu and paused/result overlays contain only **Easy Mission**, **Hard Mission**, and **Restart Mission**. Easy and Hard start a fresh mission using that profile; Restart keeps the current profile and is disabled until one has been selected. Press `M` during gameplay to pause the timer and press `M` again to resume. Depositing the configured target before time reaches zero shows the mission-complete screen; if time reaches zero first, the game-over screen appears.

Orbit camera mouse controls:

- drag to rotate around the rover
- mouse wheel to zoom in/out

## Milestone 1

Implemented:

- Working Three.js scene
- WebGLRenderer with antialiasing, shadows, ACES tone mapping, and sRGB output
- Perspective follow camera
- Expanded procedural ice cave with a wider start area, corridor, broad main chamber, ceiling, irregular walls, stalactites, stalagmites, ground-touching ice columns, emissive crystals, and six distributed mission targets
- Procedural rover and robotic arm hierarchy
- Functioning default-off rover headlights using two rover-mounted `SpotLight` objects, tuned for a clear but contained pool of light on the cave floor and walls; only the physical lenses are visible, not solid beam-cone geometry
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
- Six scannable crystal targets distributed along the cave route
- Target states: `unscanned`, `scanning`, and `scanned`
- Successful scan feedback with rover movement pause, camera mast focus, robotic arm scan pose, gripper-origin scan beam, expanding target ring, target glow boost, and scanned color change
- Failure feedback when too far away, with status text and camera-head warning shake
- On-screen scanner status text

## Milestone 3.1

Implemented:

- `X` now runs an arm-assisted scan sequence instead of only using the camera mast
- The rover first rotates in place to face the selected in-range target before the scan starts
- Scannable sample pairs use the sample pickup anchor as their shared logical target for both `X` scan and `E` collection
- Scan interaction distance is selected from the mission profile in `src/config/constants.js`, so the target must be close to the arm/sensor
- The robotic arm automatically rotates its base toward the target, raises into a scan pose, opens the gripper slightly, and emits the scan effect from the gripper area
- Manual arm demo controls on `1`, `2`, `3`, `4`, and `5` are preserved, but ignored while an automatic scan is already running
- Failed out-of-range scans keep the target unscanned and show camera-head feedback without moving the rover or arm

## Milestone 4

Implemented:

- `E` starts robotic-arm sample collection for the nearest close scanned sample target
- Each collectible sample has independent state: id, mesh, scanned flag, collected flag, and pickup anchor position
- Collection states per sample: uncollected, collecting, and collected
- Collection requires the sample target to be scanned first; otherwise the UI reports `Scan required`
- Out-of-range collection reports `Move closer to collect` without moving the rover, arm, or sample
- The rover rotates in place toward the sample pickup anchor, makes a final physical arm approach, and attaches the sample to `GripperHoldAnchor` only when the anchor is close enough
- The inventory is a raised open-top tray with a visible floor, four walls, and narrow rim rails; no panel covers the opening once the door is open
- `ContainerHatch` is parented to a stationary `ContainerDoorRailGroup` and slides only on its local X axis from `(0, 0.39, 0)` to `(-0.84, 0.39, 0)`; its local Y stays fixed throughout the animation
- The inventory is parented to the animated `Body`, so its tray, door, anchors, and stored samples inherit the rover's driving bob and tilt
- The arm clears to its raised pre-drop pose while the sliding hatch opens, then moves only to `ContainerDropHoverAnchor` above the opening; after the gripper opens, the sample visibly falls to `ContainerDropInsideAnchor` before being hidden/stored and before the arm retracts
- Collection uses a `SamplePickupAnchor`, `GripperHoldAnchor`, `GripperTipAnchor`, `ContainerDropHoverAnchor`, and `ContainerDropInsideAnchor` so scanning, pickup, holding, hovering, visible release, and storage use explicit target points
- Samples are never tweened from the ground into inventory; they move only after being attached to the gripper
- The UI shows `Samples: collected / required`, and collecting one sample does not affect the other sample targets
- Deposited samples detach from the gripper with their world transform preserved, visibly fall for 260ms with quadratic-in easing, then are reparented into the container and hidden
- Dynamic sample parenting uses Three.js `Object3D.attach()` to preserve the sample's world transform at pickup, so attachment does not visibly snap it to the gripper

Not implemented yet:

- Advanced textures pipeline
- Bloom
- A full planar reflection pass

## Milestone 5

Implemented:

- Staged loading screen with project title and initialization progress bar
- Compact mission menu with Easy Mission, Hard Mission, and profile-aware Restart Mission actions
- Explicit game states: `LOADING`, `MENU`, `PLAYING`, `PAUSED`, `MISSION_COMPLETE`, and `GAME_OVER`
- Difficulty values centralized in `src/config/constants.js`
- Timed objective driven by the configurable `MISSION.requiredSamples` value, mission-complete and game-over overlays, and restart flow
- Gameplay HUD for difficulty, time remaining, deposited samples, status, camera mode, and controls
- Input and Orbit camera controls disabled outside `PLAYING`, while existing rover, scanner, collection, arm, collision, headlight, and camera features remain available during a mission
- No physics engine; rover collision remains the lightweight bounding-box system

## Milestone 6 — Visual Polish

Implemented:

- Self-contained procedural `CanvasTexture` library for ice, ground, rock, rover metal, crystals, and collectible samples
- PBR-style `MeshStandardMaterial` / `MeshPhysicalMaterial` upgrades using base-color, normal, roughness, metalness, and emissive maps where appropriate
- Textured cave wall, ceiling, ground, ice formations, rover chassis/arm/container, crystal, and sample materials
- Cold cave-lighting refinement with hemisphere, ambient, directional shadow light, restrained blue/cyan point-light fills, functional rover headlights, and crystal glow lights
- Tuned ACES tone mapping, exposure, and blue atmospheric fog for clarity without post-processing
- GPU-accelerated WebGL rendering using real-time rasterization, texture mapping, PBR-style material response, and shadow mapping; no real-time ray tracing
- All rover, scanner, arm, and collection animations remain manually implemented in JavaScript—no imported animation clips

## Milestone 6.1 — Ice Cave Visual Rebuild

Implemented:

- Replaced the cave's former uniform cone stalactites and stalagmites with custom irregular tapered ice meshes, clustered secondary shards, and layered ground-to-ceiling ice columns
- Rebuilt the cave roof as a deeply ridged arch with ceiling-attached irregular ice sheets, dark rock/ice bands, and repositioned hanging stalactites, visually joining the roof to both cave walls while retaining clear rover/camera space
- Added uneven wall and ceiling ridges plus translucent layered floor sheets and fine crack lines, making the cave read as an enclosed, crystalline ice volume rather than flat blue surfaces
- Added `src/world/MaterialFactory.js` and retained the self-contained `src/world/ProceduralTextures.js` library: 128×128 deterministic CanvasTextures provide repeating base-color, normal, roughness, metalness, and (for crystals and samples) emissive maps without downloaded assets
- Configured texture wrapping, mipmaps, and renderer-supported anisotropic filtering for clearer repeated cave surfaces at glancing angles
- Kept obstacle collision boxes registered from the new visible formation groups, so the rover collision behavior continues to match large stalagmites, columns, walls, and crystals
- The scene remains GPU-accelerated WebGL rasterization with triangular meshes, texture mapping, PBR-style materials, lights, and shadow maps; it does not use real-time ray tracing

## Milestone 7 — Lighting, Atmosphere, UI And Performance

Implemented:

- Rebalanced the cold cave rig with softer hemisphere/ambient fill, a restrained shadow-casting ice shaft, and clear start/corridor/chamber/deep-cave light pools so the route remains readable without losing the Europa mood
- Increased the rover `SpotLight` range and intensity moderately, narrowed their falloff, and removed the former solid beam-cone meshes; the two physical lenses are the only visible headlight geometry, while the lights brighten the floor and walls ahead
- Added four small visual-only glossy frozen patches with a shared low-roughness `MeshPhysicalMaterial`, clearcoat, normal map, and direct-light highlights; they are a lightweight real-time reflection approximation, not a ray-traced or planar-reflection effect
- Restricted local point-light glow to landmark crystals and mission targets; the remaining crystals remain visibly emissive through their PBR materials without carrying an unnecessary dynamic light
- Tuned the blue scene background, linear fog range, and ACES exposure to add depth while keeping nearby scanner, collection, and driving areas clear
- Streamlined the mission HUD into compact difficulty, time, samples, status, camera, and controls lines; menus retain only Easy Mission, Hard Mission, and Restart Mission
- Improved runtime stability by removing the preserve-drawing-buffer cost, capping device pixel ratio at 1.75, reusing camera/rover vectors, avoiding expensive world-transform preservation for the now-hidden deposited sample, and making scanner cleanup release its interaction lock on every exit path. The deposit tail uses only existing tweens: the hatch opens while the arm clears, then the sample falls, the arm retracts, the hatch closes, and controls unlock without artificial waits.
- Uses GPU-accelerated WebGL real-time rasterization with triangular meshes, texture mapping, PBR-style materials, shadow mapping, emissive effects, and glossy reflection approximations; no ray tracing or heavy post-processing is used
