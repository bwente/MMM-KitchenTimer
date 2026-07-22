/* global Log, Module, KitchenTimerState */
/*
 * MagicMirror² Module: MMM-KitchenTimer
 * Originally created by Tom Short. MIT Licensed.
 */
Module.register("MMM-KitchenTimer", {
  defaults: {
    timertext: ["1m", "5m", "20m"],
    timersecs: [60, 300, 1200],
    title: "Timer",
    compact: false,
    showReset: true,
    playButtonSound: true,
    sound: true,
    soundFile: "alarm.wav",
    buttonSoundFile: "beep.wav",
    buttonSoundVolume: 0.2,
    updateInterval: 250
  },

  getScripts() {
    return ["lib/timer-state.js"];
  },

  getStyles() {
    return ["MMM-KitchenTimer.css"];
  },

  start() {
    Log.info(`Starting module: ${this.name}`);
    this.timer = new KitchenTimerState({ now: () => Date.now() });
    this.lastStatus = this.timer.snapshot().status;
    this.alarm = this.createAudio(this.config.soundFile, true, 1);
    this.buttonSound = this.createAudio(
      this.config.buttonSoundFile,
      false,
      this.config.buttonSoundVolume
    );
    this.tick = setInterval(() => this.onTick(), this.config.updateInterval);
  },

  suspend() {
    if (this.tick) clearInterval(this.tick);
    this.tick = null;
  },

  resume() {
    if (!this.tick) {
      this.tick = setInterval(() => this.onTick(), this.config.updateInterval);
    }
  },

  createAudio(filename, loop, volume) {
    if (!filename || typeof Audio === "undefined") return null;
    const audio = new Audio(this.file(filename));
    audio.loop = loop;
    audio.volume = volume;
    return audio;
  },

  play(audio) {
    if (!audio) return;
    audio.currentTime = 0;
    const promise = audio.play();
    if (promise && promise.catch) promise.catch(() => {});
  },

  silenceAlarm() {
    if (!this.alarm) return;
    this.alarm.pause();
    this.alarm.currentTime = 0;
  },

  onTick() {
    const state = this.timer.tick();
    if (state.status !== this.lastStatus) {
      this.handleStatusChange(this.lastStatus, state);
      this.lastStatus = state.status;
    }
    if (state.status === "running") this.updateDom(0);
  },

  handleStatusChange(previous, state) {
    if (state.status === "finished") {
      if (this.config.sound) this.play(this.alarm);
      this.sendNotification("KITCHEN_TIMER_FINISHED", state);
    } else if (previous === "finished") {
      this.silenceAlarm();
    }
    this.updateDom(0);
  },

  perform(action, payload) {
    const previous = this.timer.snapshot().status;
    let event;

    switch (action) {
      case "start":
        this.timer.start(this.readSeconds(payload));
        event = "KITCHEN_TIMER_STARTED";
        break;
      case "add":
        this.timer.add(this.readSeconds(payload));
        event = "KITCHEN_TIMER_UPDATED";
        break;
      case "pause":
        this.timer.pause();
        event = "KITCHEN_TIMER_PAUSED";
        break;
      case "resume":
        this.timer.resume();
        event = "KITCHEN_TIMER_RESUMED";
        break;
      case "toggle":
        this.timer.toggle();
        event = this.timer.snapshot().status === "paused"
          ? "KITCHEN_TIMER_PAUSED"
          : "KITCHEN_TIMER_RESUMED";
        break;
      case "reset":
      case "dismiss":
        this.timer.reset();
        event = action === "dismiss"
          ? "KITCHEN_TIMER_DISMISSED"
          : "KITCHEN_TIMER_RESET";
        break;
      default:
        return;
    }

    if (this.config.playButtonSound) this.play(this.buttonSound);
    const state = this.timer.snapshot();
    if (previous === "finished" || state.status !== "finished") this.silenceAlarm();
    this.lastStatus = state.status;
    this.sendNotification(event, state);
    this.updateDom(0);
  },

  readSeconds(payload) {
    const value = typeof payload === "object" && payload !== null
      ? payload.seconds
      : payload;
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  },

  notificationReceived(notification, payload) {
    const actions = {
      KITCHEN_TIMER_START: "start",
      KITCHEN_TIMER_ADD: "add",
      KITCHEN_TIMER_PAUSE: "pause",
      KITCHEN_TIMER_RESUME: "resume",
      KITCHEN_TIMER_TOGGLE: "toggle",
      KITCHEN_TIMER_RESET: "reset",
      KITCHEN_TIMER_DISMISS: "dismiss",
      START_TIMER: "start",
      PAUSE_TIMER: "pause",
      UNPAUSE_TIMER: "resume",
      RESET_TIMER: "reset"
    };
    if (actions[notification]) this.perform(actions[notification], payload);
  },

  getDom() {
    const state = this.timer.snapshot();
    const wrapper = document.createElement("section");
    wrapper.className = `kitchen-timer kitchen-timer--${state.status}` +
      (this.config.compact ? " kitchen-timer--compact" : "");

    const heading = document.createElement("h2");
    heading.className = "kitchen-timer__title";
    heading.textContent = this.config.title;
    wrapper.appendChild(heading);

    const display = document.createElement("button");
    display.className = "kitchen-timer__display";
    display.type = "button";
    display.textContent = KitchenTimerState.format(state.remainingSeconds);
    display.setAttribute("aria-label", this.displayLabel(state));
    display.addEventListener("click", () => {
      if (state.status === "finished") this.perform("dismiss");
      else if (state.status !== "idle") this.perform("toggle");
    });
    wrapper.appendChild(display);

    const status = document.createElement("div");
    status.className = "kitchen-timer__status";
    status.setAttribute("aria-live", "polite");
    status.textContent = this.statusText(state.status);
    wrapper.appendChild(status);

    const presets = document.createElement("div");
    presets.className = "kitchen-timer__presets";
    const count = Math.min(this.config.timertext.length, this.config.timersecs.length);
    for (let index = 0; index < count; index += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "kitchen-timer__preset";
      button.textContent = this.config.timertext[index];
      button.setAttribute("aria-label", `Add ${this.config.timertext[index]}`);
      button.addEventListener("click", () => this.perform("add", this.config.timersecs[index]));
      presets.appendChild(button);
    }
    wrapper.appendChild(presets);

    if (this.config.showReset) {
      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "kitchen-timer__reset";
      reset.textContent = state.status === "finished" ? "Dismiss" : "Reset";
      reset.disabled = state.status === "idle";
      reset.addEventListener("click", () => this.perform(
        state.status === "finished" ? "dismiss" : "reset"
      ));
      wrapper.appendChild(reset);
    }

    return wrapper;
  },

  displayLabel(state) {
    const time = KitchenTimerState.format(state.remainingSeconds);
    if (state.status === "running") return `${time} remaining. Press to pause.`;
    if (state.status === "paused") return `${time} remaining. Press to resume.`;
    if (state.status === "finished") return "Timer finished. Press to dismiss.";
    return "Timer is ready";
  },

  statusText(status) {
    return {
      idle: "Choose a duration",
      running: "Tap the time to pause",
      paused: "Paused",
      finished: "Time is up"
    }[status];
  }
});
