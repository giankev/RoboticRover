# CryoRover - Interactive Europa Ice Cave Explorer

CryoRover is an interactive Three.js/WebGL scene set inside an icy cave on Europa. The player drives a scientific rover through the cave, scans mineral targets, and collects sample fragments with a robotic arm. The project demonstrates hierarchical modeling, local transformations, lighting, procedural textures, user interaction, camera control, and JavaScript-authored animations. All rover, scanner, arm, gripper, inventory, and environmental animations are implemented in code; no imported animation clips are used.

## Project Overview

- Real-time 3D browser application built with JavaScript, Three.js, and Vite.
- Procedural Europa cave with ice walls, ceiling, stalactites, stalagmites, crystals, fog, and glossy frozen patches.
- Playable mission loop with Easy/Hard difficulty, compact HUD, timer, scanner, sample collection, and final mission states.
- Complex procedural rover model with wheels, headlights, camera mast, antenna, inventory container, and articulated robotic arm.

## Screenshots

No screenshots are committed yet. See [docs/screenshots/README.md](docs/screenshots/README.md) for the required capture list:

- `overview.png`: rover inside the ice cave.
- `scanner.png`: scanner effect aimed at a sample.
- `collection.png`: robotic arm collecting or depositing a sample.
- `menu.png` optional: clean Easy/Hard/Restart menu.

## Main Features

- Procedural Europa ice cave with an explorable route and enclosed cave volume.
- Hierarchical rover model built from Three.js primitives.
- Robotic arm with local joint rotations, animated gripper, and sample hold anchor.
- Scanner system with rover alignment, arm-assisted scan pose, beam/ring effect, and per-target scanned state.
- Physical-looking sample collection: reach, grab, dynamic parenting to the gripper, lift, sliding inventory door, deposit, and storage.
- Easy and Hard mission profiles with different timers and interaction ranges.
- Minimal loading/menu/result overlays and compact in-game HUD.
- Rover headlights, multiple camera modes, OrbitControls mouse support, collision helpers, and bounding-box collision.
- PBR-style procedural materials, emissive crystals/samples, fog, shadow mapping, and lightweight glossy ice reflection approximation.

## Controls

| Input | Action |
| --- | --- |
| `W` / `S` | Move rover forward / backward |
| `A` / `D` | Rotate rover left / right |
| `F` | Toggle rover headlights |
| `C` | Cycle camera mode: Follow, Orbit, Arm |
| `X` | Scan nearest unscanned sample target when in range |
| `E` | Collect nearest scanned sample when in range |
| `M` | Open/close mission menu during gameplay |
| `R` | Reset rover position |
| `B` | Toggle optional collision debug boxes |
| `1` | Robotic arm idle pose |
| `2` | Robotic arm ready pose |
| `3` | Robotic arm reach pose |
| `4` | Toggle gripper open/closed |
| `5` | Play robotic arm inspection sequence |

In Orbit camera mode, drag the mouse to rotate around the rover and use the mouse wheel to zoom.

## How To Run

```bash
npm install
npm run dev
```

Vite will print a local URL, usually:

```text
http://localhost:5173/
```

To create a production build:

```bash
npm run build
```

On Windows PowerShell, use `npm.cmd` if plain `npm` is blocked:

```bash
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

## Technologies Used

- JavaScript modules, no React and no TypeScript.
- Three.js for scene graph, geometry, materials, lights, cameras, shadows, and WebGL rendering.
- Vite for development server and production build.
- `@tweenjs/tween.js` for smooth authored interpolation.
- Three.js `OrbitControls` for mouse-controlled orbit camera.
- Procedural CanvasTexture maps for color, normal, roughness, metalness, and emissive-style material detail.
- Lightweight custom collision system; no physics engine is used.

## Graphics Techniques

- Procedural triangular meshes for cave ground, walls, ceiling, ice formations, crystals, rover, and robotic arm.
- Hierarchical transformations for rover body, wheels, mast, antenna, headlights, inventory, arm joints, wrist, gripper, and claws.
- GPU-accelerated WebGL real-time rasterization, not ray tracing.
- PBR-style `MeshStandardMaterial` and `MeshPhysicalMaterial` surfaces with procedural texture maps.
- Shadow mapping from the main cave light and rover headlights.
- Emissive materials and small point lights for crystals and collectible samples.
- Fog and cold blue lighting for Europa cave atmosphere.
- Lightweight glossy puddle/reflection approximation through material response, not planar ray-traced reflections.
- Manual JavaScript animation using position, rotation, scale, object parenting, and tween.js easing.

## Project Requirements Coverage

- **Hierarchical model:** rover, articulated robotic arm, gripper claws, camera mast, antenna, and sliding sample container.
- **Lights and textures:** cave lighting, rover headlights, crystal glow, shadows, fog, and procedural PBR-style material maps.
- **User interaction:** driving, scanning, collecting, headlights, camera modes, difficulty selection, HUD, menu, and arm demo keys.
- **Animations:** wheels, rover body motion, camera mast, antenna, crystals, scanner, arm poses, gripper, sample pickup/deposit, and sliding inventory door.
- **Technical constraints:** animations are authored in JavaScript; no imported animation clips, no physics engine, and no ray tracing.

## Documentation

The longer technical report and user manual is available here:

- [docs/Report.md](docs/Report.md)

## Deployment / GitHub Pages

Live demo: TODO add GitHub Pages link after deployment.

For deployment, run `npm run build` and publish the Vite output according to the repository's GitHub Pages setup.
