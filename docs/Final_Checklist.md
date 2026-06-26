# Final Submission Checklist

Use this checklist before the final presentation and before publishing to GitHub Pages.

## Local Dev Test

- Run `npm install` or `npm ci`.
- Run `npm run dev`.
- Open the Vite local URL.
- Confirm the app loads without console errors.
- Confirm the loading screen appears and advances to the menu.
- Confirm the menu shows only:
  - Easy Mission
  - Hard Mission
  - Restart Mission

## Production Build Test

- Run `npm run build`.
- Confirm the build completes successfully.
- Confirm `dist/` is generated locally but remains ignored by Git unless using a deliberate deployment branch workflow.

## Production Preview Test

- Run `npm run preview`.
- Open the preview URL.
- Confirm the production build loads correctly.
- Confirm the loading screen, menu, HUD, cave scene, rover, and controls work in preview.

## GitHub Pages Test

- Confirm `vite.config.js` has the correct `base` for the deployment target.
- For a repository page at `https://USERNAME.github.io/REPO_NAME/`, either keep the relative `base: './'` or set the absolute base to `"/REPO_NAME/"` if required by the deployment workflow.
- Publish the production build through the selected GitHub Pages workflow.
- Add the final live URL to `README.md`.
- Open the live URL and confirm assets, styles, scripts, textures, and controls load correctly.

## Controls Test

- `W` / `S`: rover moves forward and backward.
- `A` / `D`: rover rotates left and right.
- `F`: headlights toggle.
- `C`: camera cycles through Follow, Orbit, and Arm.
- Mouse drag/wheel: Orbit camera rotates and zooms when Orbit mode is active.
- `M`: menu opens and closes during gameplay.
- `R`: rover position resets.
- `B`: optional collision debug helpers toggle.
- `1`: arm idle pose.
- `2`: arm ready pose.
- `3`: arm reach pose.
- `4`: gripper opens/closes.
- `5`: arm inspection sequence plays.

## Scan and Collection Test

- Start an Easy Mission.
- Drive near an unscanned sample target.
- Press `X` and confirm the rover aligns, the mast/arm aim, scanner beam points at the sample, the target changes to scanned state, and controls unlock afterward.
- Press `E` near the scanned sample and confirm the arm reaches the sample, gripper closes, sample attaches only after the gripper reaches it, sample is carried to the container, hatch opens, sample drops into storage, hatch closes, arm returns idle, sample counter updates, and controls unlock afterward.
- Try pressing `X` during collection and `E` during scanning; confirm overlapping sequences do not start.
- Move too far from a target and confirm short failure messages appear without moving the arm/sample.

## Win and Game Over Test

- Collect the required number of samples and confirm the Mission Complete screen appears.
- Let the timer expire before collecting enough samples and confirm the Time Expired / Mission Failed screen appears.
- Confirm result screens keep only Easy Mission, Hard Mission, and Restart Mission actions.

## Documentation Test

- Confirm `README.md` is a final project overview, not a milestone changelog.
- Confirm `README.md` includes controls, technologies, graphics techniques, local run/build instructions, documentation link, and GitHub Pages placeholder/live URL.
- Confirm `docs/Report.md` describes Three.js/WebGL, GPU rasterization, triangular meshes, hierarchical rover/arm model, lights, textures, tween.js animations, no imported animations, no ray tracing, and no physics engine.
- Confirm `docs/screenshots/README.md` lists required screenshot captures.
- Add real screenshots to `docs/screenshots/` when available and only then add image links to `README.md`.

## Repository Cleanup

- Confirm `node_modules/` is ignored.
- Confirm `dist/` is ignored unless intentionally using a deployment branch strategy.
- Confirm no unrelated debug files, temporary logs, or generated artifacts are staged.
- Confirm `npm audit` reports zero vulnerabilities or document any unavoidable exception.
