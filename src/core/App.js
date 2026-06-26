import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { GAME_STATES, MISSION } from '../config/constants.js';
import { InputController } from '../interaction/InputController.js';
import { SampleCollectionSystem } from '../interaction/SampleCollectionSystem.js';
import { ScannerSystem } from '../interaction/ScannerSystem.js';
import { Rover } from '../rover/Rover.js';
import { IceCave } from '../world/IceCave.js';
import { createLights } from '../world/Lights.js';
import { CameraManager } from './CameraManager.js';
import { GameStateManager } from './GameStateManager.js';
import { Renderer } from './Renderer.js';

export class App {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x061a29);
    this.scene.fog = new THREE.Fog(0x0a2a3d, 30, 224);

    this.renderer = new Renderer(container);
    this.cameraManager = new CameraManager(
      container.clientWidth / container.clientHeight,
      this.renderer.domElement
    );

    this.iceCave = new IceCave();
    this.rover = new Rover();
    this.scanner = new ScannerSystem({
      rover: this.rover,
      targets: this.iceCave.scannableTargets
    });
    this.collector = new SampleCollectionSystem({
      rover: this.rover,
      targets: this.iceCave.scannableTargets,
      onCollectionStart: () => this.cameraManager.enterTemporaryMode('Arm', this.rover),
      onCollectionEnd: ({ completed, sampleDeposited } = {}) => {
        this.cameraManager.exitTemporaryMode(this.rover);
        if (completed || sampleDeposited) {
          this.missionMessage = 'Sample stored.';
        }
      }
    });
    this.input = new InputController({
      onToggleHeadlights: () => this.runGameplayAction(() => this.rover.toggleHeadlights()),
      onReset: () => this.runResetAction(),
      onToggleCollisionDebug: () =>
        this.runGameplayAction(() => this.iceCave.collisionSystem.toggleDebug()),
      onTogglePause: () => this.togglePauseMenu(),
      onCycleCamera: () => this.cycleCameraMode(),
      onScan: () => this.runScanAction(),
      onCollect: () => this.runCollectionAction(),
      onArmIdle: () => this.runManualArmAction(() => this.rover.setArmIdle()),
      onArmReady: () => this.runManualArmAction(() => this.rover.setArmReady()),
      onArmReach: () => this.runManualArmAction(() => this.rover.setArmReach()),
      onToggleGripper: () => this.runManualArmAction(() => this.rover.toggleGripper()),
      onArmInspection: () =>
        this.runManualArmAction(() => this.rover.playArmInspectionSequence())
    });

    this.scene.add(createLights());
    this.scene.add(this.iceCave.group);
    this.scene.add(this.rover.root);
    this.scene.add(this.scanner.group);

    this.cameraManager.snapTo(this.rover);
    this.missionMessage = 'Choose a mission';
    this.statusLines = this.createStatusOverlay();
    this.gameOverlay = this.createGameOverlay();
    this.game = new GameStateManager({
      onStateChange: (state) => this.handleGameStateChange(state),
      onLoadingProgress: () => this.updateGameOverlay(),
      onMissionStart: (difficulty) => this.configureMission(difficulty)
    });
    this.game.startLoading();

    this.onResize = this.onResize.bind(this);
    this.update = this.update.bind(this);
    window.addEventListener('resize', this.onResize);
  }

  start() {
    this.renderer.setAnimationLoop(this.update);
  }

  update(time) {
    const delta = Math.min(this.clock.getDelta(), 0.05);

    const movement = !this.isGameplayActive() || this.isInteractionLocked()
      ? { throttle: 0, turn: 0 }
      : this.input.getMovement();

    this.rover.update(delta, movement, this.iceCave.collisionSystem);
    if (this.isGameplayActive()) {
      this.iceCave.updateTargetFocus(
        this.rover.root.position,
        this.scanner.interactionDistance,
        this.collector.interactionDistance
      );
    } else {
      this.iceCave.clearTargetFocus();
    }
    this.iceCave.update(delta);
    TWEEN.update(time);
    this.scanner.update(delta);
    this.cameraManager.update(this.rover, delta);
    this.game.update(delta, this.collector.collectedCount, {
      terminalTransitionReady: !this.isInteractionLocked()
    });
    this.updateStatusOverlay();

    this.renderer.render(this.scene, this.cameraManager.camera);
  }

  resetRover() {
    this.rover.reset();
    this.cameraManager.snapTo(this.rover);
  }

  runResetAction() {
    if (!this.isGameplayActive() || this.isInteractionLocked()) {
      return;
    }

    this.resetRover();
  }

  cycleCameraMode() {
    if (!this.isGameplayActive()) {
      return;
    }

    this.cameraManager.cycleMode(this.rover);
    this.updateStatusOverlay();
  }

  runManualArmAction(action) {
    if (!this.isGameplayActive() || this.isInteractionLocked()) {
      return;
    }

    action();
  }

  runScanAction() {
    if (!this.isGameplayActive()) {
      return;
    }

    if (this.collector.isCollecting) {
      this.missionMessage = 'Collection in progress.';
      return;
    }

    this.scanner.activate();
  }

  runCollectionAction() {
    if (!this.isGameplayActive()) {
      return;
    }

    if (this.scanner.isScanning) {
      this.missionMessage = 'Scan in progress.';
      return;
    }

    this.collector.activate();
  }

  isInteractionLocked() {
    return this.scanner.isScanning || this.collector.isCollecting;
  }

  isGameplayActive() {
    return this.game?.state === GAME_STATES.PLAYING;
  }

  runGameplayAction(action) {
    if (!this.isGameplayActive()) {
      return;
    }

    action();
  }

  togglePauseMenu() {
    if (this.isInteractionLocked()) {
      return;
    }

    this.game.togglePause();
  }

  configureMission(difficulty) {
    this.scanner.reset();
    this.collector.reset();
    this.iceCave.resetScannableTargets();
    this.rover.resetMissionState();
    this.scanner.setInteractionDistance(difficulty.scanDistance);
    this.collector.setInteractionDistance(difficulty.collectionDistance);
    this.missionMessage = 'Scan a sample, then collect it.';
    this.cameraManager.setMode('Follow', this.rover);
    this.resetRover();
  }

  handleGameStateChange(state) {
    const isPlaying = state === GAME_STATES.PLAYING;
    this.input.setEnabled(isPlaying);
    this.cameraManager.setControlsEnabled(isPlaying);
    this.statusLines.overlay.classList.toggle('is-hidden', !isPlaying);

    if (state === GAME_STATES.MISSION_COMPLETE) {
      this.missionMessage = 'Mission complete.';
    } else if (state === GAME_STATES.GAME_OVER) {
      this.missionMessage = 'Time expired.';
    }

    this.updateGameOverlay();
    this.updateStatusOverlay();
  }

  createStatusOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'mission-hud';

    const difficultyLine = document.createElement('div');
    difficultyLine.className = 'mission-hud__difficulty';
    const timerLine = document.createElement('div');
    timerLine.className = 'mission-hud__timer';
    const samplesLine = document.createElement('div');
    samplesLine.className = 'mission-hud__samples';
    const statusLine = document.createElement('div');
    statusLine.className = 'mission-hud__status';
    const cameraLine = document.createElement('div');
    cameraLine.className = 'mission-hud__camera';
    const controlsLine = document.createElement('div');
    controlsLine.className = 'mission-hud__controls';

    overlay.append(
      difficultyLine,
      timerLine,
      samplesLine,
      statusLine,
      cameraLine,
      controlsLine
    );
    this.container.appendChild(overlay);

    return {
      overlay,
      difficultyLine,
      timerLine,
      samplesLine,
      statusLine,
      cameraLine,
      controlsLine
    };
  }

  updateStatusOverlay() {
    if (!this.statusLines || !this.isGameplayActive()) {
      return;
    }

    const { difficulty } = this.game;

    this.statusLines.difficultyLine.textContent =
      `Difficulty: ${this.getDifficultyDisplayLabel(difficulty)}`;
    this.statusLines.timerLine.textContent = `Time: ${this.game.formattedTime}`;
    this.statusLines.samplesLine.textContent =
      `Samples: ${this.collector.collectedCount} / ${difficulty.requiredSamples}`;
    this.statusLines.statusLine.textContent = `Status: ${this.getMissionStatus()}`;
    this.statusLines.cameraLine.textContent = `Camera: ${this.cameraManager.modeLabel}`;
    this.statusLines.controlsLine.textContent = difficulty.showExtendedHints
      ? 'W/S Drive | A/D Turn | X Scan | E Collect | C Camera | F Lights | M Menu'
      : 'W/S Drive | A/D Turn | X Scan | E Collect | M Menu';
  }

  getMissionStatus() {
    if (this.collector.isCollecting) {
      return this.collector.statusLabel;
    }

    if (this.scanner.isScanning) {
      return this.scanner.statusLabel;
    }

    if (this.collector.statusLabel !== 'Ready') {
      return this.collector.statusLabel;
    }

    if (this.scanner.statusLabel !== 'Ready') {
      return this.scanner.statusLabel;
    }

    return this.missionMessage;
  }

  getDifficultyDisplayLabel(difficulty) {
    return difficulty?.label?.replace(' Mission', '') ?? 'Mission';
  }

  createGameOverlay() {
    const overlay = document.createElement('section');
    overlay.className = 'game-overlay is-visible';
    overlay.setAttribute('aria-live', 'polite');

    const panel = document.createElement('div');
    panel.className = 'game-overlay__panel';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'game-overlay__eyebrow';
    const title = document.createElement('h1');
    const message = document.createElement('p');
    message.className = 'game-overlay__message';

    const loading = document.createElement('div');
    loading.className = 'game-overlay__loading';
    const progressTrack = document.createElement('div');
    progressTrack.className = 'game-overlay__progress-track';
    const progressFill = document.createElement('div');
    progressFill.className = 'game-overlay__progress-fill';
    const progressLabel = document.createElement('p');
    progressLabel.className = 'game-overlay__progress-label';
    progressTrack.appendChild(progressFill);
    loading.append(progressTrack, progressLabel);

    const missionButtons = document.createElement('div');
    missionButtons.className = 'game-overlay__actions';
    const easyButton = this.createOverlayButton('Easy Mission', () =>
      this.game.startMission('easy')
    );
    const hardButton = this.createOverlayButton('Hard Mission', () =>
      this.game.startMission('hard')
    );
    const restartButton = this.createOverlayButton('Restart Mission', () =>
      this.game.restartMission()
    );
    missionButtons.append(easyButton, hardButton, restartButton);

    panel.append(
      eyebrow,
      title,
      message,
      loading,
      missionButtons
    );
    overlay.appendChild(panel);
    this.container.appendChild(overlay);

    return {
      overlay,
      eyebrow,
      title,
      message,
      loading,
      progressFill,
      progressLabel,
      missionButtons,
      restartButton
    };
  }

  createOverlayButton(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  updateGameOverlay() {
    if (!this.gameOverlay || !this.game) {
      return;
    }

    const { state, difficulty } = this.game;
    const isPlaying = state === GAME_STATES.PLAYING;
    const { overlay } = this.gameOverlay;
    overlay.classList.toggle('is-visible', !isPlaying);
    overlay.dataset.state = state.toLowerCase();

    const actionMenuStates = [
      GAME_STATES.MENU,
      GAME_STATES.PAUSED,
      GAME_STATES.MISSION_COMPLETE,
      GAME_STATES.GAME_OVER
    ];
    const isLoading = state === GAME_STATES.LOADING;
    this.gameOverlay.loading.hidden = !isLoading;
    this.gameOverlay.missionButtons.hidden = !actionMenuStates.includes(state);
    this.gameOverlay.restartButton.disabled = !difficulty;
    this.gameOverlay.eyebrow.hidden = isLoading;
    this.gameOverlay.progressLabel.hidden = !isLoading;

    if (state === GAME_STATES.LOADING) {
      this.gameOverlay.eyebrow.textContent = 'EUROPA EXPEDITION';
      this.gameOverlay.title.textContent = 'CryoRover - Europa Ice Cave Explorer';
      this.gameOverlay.message.textContent = 'Map loading...';
      this.gameOverlay.progressFill.style.width = `${this.game.loadingProgress}%`;
      this.gameOverlay.progressLabel.textContent = this.game.loadingLabel;
      return;
    }

    if (state === GAME_STATES.MENU) {
      this.gameOverlay.eyebrow.textContent = 'EUROPA EXPEDITION';
      this.gameOverlay.title.textContent = 'CryoRover - Europa Ice Cave Explorer';
      const sampleLabel = MISSION.requiredSamples === 1 ? 'sample' : 'samples';
      this.gameOverlay.message.textContent = `Scan and secure ${MISSION.requiredSamples} mineral ${sampleLabel} before the mission timer expires.`;
      return;
    }

    if (state === GAME_STATES.PAUSED) {
      this.gameOverlay.eyebrow.textContent = 'MISSION PAUSED';
      this.gameOverlay.title.textContent = 'Expedition on hold';
      this.gameOverlay.message.textContent =
        'The timer and rover controls are paused. Press M to resume, or choose a mission.';
      return;
    }

    if (state === GAME_STATES.MISSION_COMPLETE) {
      this.gameOverlay.eyebrow.textContent = 'MISSION COMPLETE';
      this.gameOverlay.title.textContent = 'Mission Complete';
      this.gameOverlay.message.textContent =
        `${this.collector.collectedCount} / ${difficulty.requiredSamples} samples stored. ${difficulty.label}. ${this.game.formattedTime} remaining.`;
      return;
    }

    if (state === GAME_STATES.GAME_OVER) {
      this.gameOverlay.eyebrow.textContent = 'MISSION FAILED';
      this.gameOverlay.title.textContent = 'Time Expired';
      this.gameOverlay.message.textContent =
        `${this.collector.collectedCount} / ${difficulty.requiredSamples} samples stored. ${difficulty.label}.`;
    }
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.renderer.resize(width, height);
    this.cameraManager.resize(width / height);
  }
}
