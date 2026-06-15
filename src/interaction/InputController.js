export class InputController {
  constructor({ onToggleHeadlights, onReset, onToggleCollisionDebug }) {
    this.keys = new Set();
    this.actionKeys = new Set();
    this.onToggleHeadlights = onToggleHeadlights;
    this.onReset = onReset;
    this.onToggleCollisionDebug = onToggleCollisionDebug;

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

    if (event.code === 'KeyF') {
      if (this.actionKeys.has(event.code)) {
        return;
      }
      this.actionKeys.add(event.code);
      this.onToggleHeadlights();
      return;
    }

    if (event.code === 'KeyR') {
      if (this.actionKeys.has(event.code)) {
        return;
      }
      this.actionKeys.add(event.code);
      this.onReset();
      return;
    }

    if (event.code === 'KeyB') {
      if (this.actionKeys.has(event.code)) {
        return;
      }
      this.actionKeys.add(event.code);
      this.onToggleCollisionDebug();
      return;
    }

    this.keys.add(event.code);
  }

  onKeyUp(event) {
    this.keys.delete(event.code);
    this.actionKeys.delete(event.code);
  }
}

function isControlKey(code) {
  return ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyR', 'KeyB'].includes(code);
}
