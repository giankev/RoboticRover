export class InputController {
  constructor({
    onToggleHeadlights,
    onReset,
    onToggleCollisionDebug,
    onTogglePause,
    onCycleCamera,
    onScan,
    onCollect,
    onArmIdle,
    onArmReady,
    onArmReach,
    onToggleGripper,
    onArmInspection
  }) {
    this.keys = new Set();
    this.actionKeys = new Set();
    this.enabled = true;
    this.onToggleHeadlights = onToggleHeadlights;
    this.onReset = onReset;
    this.onToggleCollisionDebug = onToggleCollisionDebug;
    this.onTogglePause = onTogglePause;
    this.onCycleCamera = onCycleCamera;
    this.onScan = onScan;
    this.onCollect = onCollect;
    this.onArmIdle = onArmIdle;
    this.onArmReady = onArmReady;
    this.onArmReach = onArmReach;
    this.onToggleGripper = onToggleGripper;
    this.onArmInspection = onArmInspection;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  getMovement() {
    if (!this.enabled) {
      return { throttle: 0, turn: 0 };
    }

    const forward = this.keys.has('KeyW') ? 1 : 0;
    const backward = this.keys.has('KeyS') ? 1 : 0;
    const left = this.keys.has('KeyA') ? 1 : 0;
    const right = this.keys.has('KeyD') ? 1 : 0;

    return {
      throttle: forward - backward,
      turn: left - right
    };
  }

  onKeyDown(event) {
    if (isControlKey(event.code)) {
      event.preventDefault();
    }

    const action = this.getActionForCode(event.code);

    if (event.code === 'KeyM') {
      if (this.actionKeys.has(event.code)) {
        return;
      }
      this.actionKeys.add(event.code);
      action?.();
      return;
    }

    if (!this.enabled) {
      return;
    }

    if (action) {
      if (this.actionKeys.has(event.code)) {
        return;
      }
      this.actionKeys.add(event.code);
      action();
      return;
    }

    this.keys.add(event.code);
  }

  onKeyUp(event) {
    this.keys.delete(event.code);
    this.actionKeys.delete(event.code);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.keys.clear();
    const pauseKeyHeld = this.actionKeys.has('KeyM');
    this.actionKeys.clear();

    if (pauseKeyHeld) {
      this.actionKeys.add('KeyM');
    }
  }

  getActionForCode(code) {
    return {
      KeyF: this.onToggleHeadlights,
      KeyR: this.onReset,
      KeyB: this.onToggleCollisionDebug,
      KeyM: this.onTogglePause,
      KeyC: this.onCycleCamera,
      KeyX: this.onScan,
      KeyE: this.onCollect,
      Digit1: this.onArmIdle,
      Digit2: this.onArmReady,
      Digit3: this.onArmReach,
      Digit4: this.onToggleGripper,
      Digit5: this.onArmInspection
    }[code];
  }
}

function isControlKey(code) {
  return [
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'KeyF',
    'KeyR',
    'KeyB',
    'KeyM',
    'KeyC',
    'KeyX',
    'KeyE',
    'Digit1',
    'Digit2',
    'Digit3',
    'Digit4',
    'Digit5'
  ].includes(code);
}
