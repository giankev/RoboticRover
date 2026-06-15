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
- `B` toggle collision debug boxes

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

Not implemented yet:

- Scanner
- Sample collection
- Advanced textures pipeline
- Bloom
- Reflections
- Physics engine
