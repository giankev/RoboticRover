export class InputController {
  constructor({
    onToggleHeadlights,
    onReset,
    onToggleCollisionDebug,
    onCycleCamera,
    onScan,
    onArmIdle,
    onArmReady,
    onArmReach,
    onToggleGripper,
    onArmInspection
  }) {
    this.keys = new Set();
    this.actionKeys = new Set();
    this.onToggleHeadlights = onToggleHeadlights;
    this.onReset = onReset;
    this.onToggleCollisionDebug = onToggleCollisionDebug;
    this.onCycleCamera = onCycleCamera;
    this.onScan = onScan;
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

  getActionForCode(code) {
    return {
      KeyF: this.onToggleHeadlights,
      KeyR: this.onReset,
      KeyB: this.onToggleCollisionDebug,
      KeyC: this.onCycleCamera,
      KeyX: this.onScan,
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
    'KeyC',
    'KeyX',
    'Digit1',
    'Digit2',
    'Digit3',
    'Digit4',
    'Digit5'
  ].includes(code);
}
