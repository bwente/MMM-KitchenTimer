(function (root, factory) {
  const TimerState = factory();
  if (typeof module === "object" && module.exports) module.exports = TimerState;
  root.KitchenTimerState = TimerState;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  class KitchenTimerState {
    constructor(options = {}) {
      this.now = options.now || (() => Date.now());
      this.reset();
    }

    start(seconds) {
      const duration = KitchenTimerState.validSeconds(seconds);
      if (!duration) return this.snapshot();
      this.remainingMs = duration * 1000;
      this.endsAt = this.now() + this.remainingMs;
      this.status = "running";
      return this.snapshot();
    }

    add(seconds) {
      const duration = KitchenTimerState.validSeconds(seconds);
      if (!duration) return this.snapshot();
      this.tick();
      const addedMs = duration * 1000;
      if (this.status === "running") {
        this.endsAt += addedMs;
        this.remainingMs = Math.max(0, this.endsAt - this.now());
      } else {
        this.remainingMs = (this.status === "paused" ? this.remainingMs : 0) + addedMs;
        this.endsAt = this.now() + this.remainingMs;
        this.status = "running";
      }
      return this.snapshot();
    }

    pause() {
      this.tick();
      if (this.status === "running") {
        this.remainingMs = Math.max(0, this.endsAt - this.now());
        this.endsAt = null;
        this.status = "paused";
      }
      return this.snapshot();
    }

    resume() {
      if (this.status === "paused" && this.remainingMs > 0) {
        this.endsAt = this.now() + this.remainingMs;
        this.status = "running";
      }
      return this.snapshot();
    }

    toggle() {
      return this.status === "running" ? this.pause() : this.resume();
    }

    tick() {
      if (this.status === "running") {
        this.remainingMs = Math.max(0, this.endsAt - this.now());
        if (this.remainingMs === 0) {
          this.endsAt = null;
          this.status = "finished";
        }
      }
      return this.snapshot();
    }

    reset() {
      this.remainingMs = 0;
      this.endsAt = null;
      this.status = "idle";
      return this.snapshot();
    }

    snapshot() {
      return Object.freeze({
        status: this.status,
        remainingSeconds: Math.max(0, Math.ceil(this.remainingMs / 1000)),
        endsAt: this.endsAt
      });
    }

    static validSeconds(value) {
      const seconds = Number(value);
      return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    }

    static format(totalSeconds) {
      const seconds = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainder = seconds % 60;
      const parts = hours ? [hours, minutes, remainder] : [minutes, remainder];
      return parts.map((part, index) => index === 0 ? String(part) : String(part).padStart(2, "0")).join(":");
    }
  }

  return KitchenTimerState;
}));
