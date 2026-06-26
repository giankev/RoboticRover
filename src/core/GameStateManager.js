import { DIFFICULTIES, GAME_STATES } from '../config/constants.js';

const LOADING_STAGES = [
  { progress: 18, label: 'Mapping ice-cave terrain', delay: 120 },
  { progress: 46, label: 'Assembling rover systems', delay: 380 },
  { progress: 74, label: 'Calibrating scanner and arm', delay: 680 },
  { progress: 100, label: 'Mission control online', delay: 980 }
];

export class GameStateManager {
  constructor({ onStateChange = () => {}, onLoadingProgress = () => {}, onMissionStart = () => {} } = {}) {
    this.onStateChange = onStateChange;
    this.onLoadingProgress = onLoadingProgress;
    this.onMissionStart = onMissionStart;

    this.state = GAME_STATES.LOADING;
    this.difficulty = null;
    this.timeRemaining = 0;
    this.pendingTerminalState = null;
    this.loadingProgress = 0;
    this.loadingLabel = 'Map loading...';
    this.loadingTimers = [];
  }

  startLoading() {
    this.notifyState();
    this.onLoadingProgress(this.loadingProgress, this.loadingLabel);

    this.loadingTimers = LOADING_STAGES.map((stage, index) =>
      window.setTimeout(() => {
        this.loadingProgress = stage.progress;
        this.loadingLabel = stage.label;
        this.onLoadingProgress(this.loadingProgress, this.loadingLabel);

        if (index === LOADING_STAGES.length - 1) {
          window.setTimeout(() => this.setState(GAME_STATES.MENU), 260);
        }
      }, stage.delay)
    );
  }

  startMission(difficultyId) {
    const difficulty = DIFFICULTIES[difficultyId];

    if (
      !difficulty ||
      ![
        GAME_STATES.MENU,
        GAME_STATES.PAUSED,
        GAME_STATES.MISSION_COMPLETE,
        GAME_STATES.GAME_OVER
      ].includes(this.state)
    ) {
      return false;
    }

    this.difficulty = difficulty;
    this.timeRemaining = difficulty.timeLimitSeconds;
    this.pendingTerminalState = null;
    this.onMissionStart(difficulty);
    this.setState(GAME_STATES.PLAYING);
    return true;
  }

  restartMission() {
    if (
      !this.difficulty ||
      ![
        GAME_STATES.PAUSED,
        GAME_STATES.MENU,
        GAME_STATES.MISSION_COMPLETE,
        GAME_STATES.GAME_OVER
      ].includes(this.state)
    ) {
      return false;
    }

    this.timeRemaining = this.difficulty.timeLimitSeconds;
    this.pendingTerminalState = null;
    this.onMissionStart(this.difficulty);
    this.setState(GAME_STATES.PLAYING);
    return true;
  }

  pauseMission() {
    if (this.state !== GAME_STATES.PLAYING) {
      return false;
    }

    this.setState(GAME_STATES.PAUSED);
    return true;
  }

  resumeMission() {
    if (this.state !== GAME_STATES.PAUSED) {
      return false;
    }

    this.setState(GAME_STATES.PLAYING);
    return true;
  }

  togglePause() {
    return this.state === GAME_STATES.PAUSED
      ? this.resumeMission()
      : this.pauseMission();
  }

  update(delta, collectedSamples, { terminalTransitionReady = true } = {}) {
    if (this.state !== GAME_STATES.PLAYING || !this.difficulty) {
      return;
    }

    if (this.pendingTerminalState) {
      if (terminalTransitionReady) {
        this.setState(this.pendingTerminalState);
      }
      return;
    }

    if (collectedSamples >= this.difficulty.requiredSamples) {
      this.queueTerminalState(
        GAME_STATES.MISSION_COMPLETE,
        terminalTransitionReady
      );
      return;
    }

    this.timeRemaining = Math.max(0, this.timeRemaining - delta);

    if (this.timeRemaining <= 0) {
      this.queueTerminalState(GAME_STATES.GAME_OVER, terminalTransitionReady);
    }
  }

  get remainingSeconds() {
    return Math.ceil(this.timeRemaining);
  }

  get formattedTime() {
    const seconds = this.remainingSeconds;
    const minutesPart = Math.floor(seconds / 60);
    const secondsPart = String(seconds % 60).padStart(2, '0');
    return `${minutesPart}:${secondsPart}`;
  }

  setState(nextState) {
    if (this.state === nextState) {
      return;
    }

    this.state = nextState;
    this.notifyState();
  }

  queueTerminalState(nextState, terminalTransitionReady) {
    this.pendingTerminalState = nextState;

    if (terminalTransitionReady) {
      this.setState(nextState);
    }
  }

  notifyState() {
    this.onStateChange(this.state, this.difficulty);
  }
}
