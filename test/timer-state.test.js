const test = require("node:test");
const assert = require("node:assert/strict");
const KitchenTimerState = require("../lib/timer-state");

function clock() {
  let value = 0;
  return {
    now: () => value,
    advance: (milliseconds) => { value += milliseconds; }
  };
}

test("starts and counts down using wall-clock time", () => {
  const time = clock();
  const timer = new KitchenTimerState({ now: time.now });
  timer.start(60);
  time.advance(1250);
  assert.deepEqual(timer.tick(), {
    status: "running",
    remainingSeconds: 59,
    endsAt: 60000
  });
});

test("finishes at zero without counting negative", () => {
  const time = clock();
  const timer = new KitchenTimerState({ now: time.now });
  timer.start(1);
  time.advance(5000);
  assert.equal(timer.tick().status, "finished");
  assert.equal(timer.snapshot().remainingSeconds, 0);
});

test("pauses and resumes without losing remaining time", () => {
  const time = clock();
  const timer = new KitchenTimerState({ now: time.now });
  timer.start(10);
  time.advance(2500);
  assert.equal(timer.pause().remainingSeconds, 8);
  time.advance(10000);
  assert.equal(timer.snapshot().remainingSeconds, 8);
  timer.resume();
  time.advance(7500);
  assert.equal(timer.tick().status, "finished");
});

test("adds time to running, paused, and finished timers", () => {
  const time = clock();
  const timer = new KitchenTimerState({ now: time.now });
  timer.add(5);
  time.advance(2000);
  assert.equal(timer.add(5).remainingSeconds, 8);
  timer.pause();
  assert.equal(timer.add(2).status, "running");
  time.advance(10000);
  assert.equal(timer.tick().status, "finished");
  assert.equal(timer.add(3).remainingSeconds, 3);
});

test("reset returns to idle", () => {
  const timer = new KitchenTimerState();
  timer.start(10);
  assert.deepEqual(timer.reset(), {
    status: "idle",
    remainingSeconds: 0,
    endsAt: null
  });
});

test("formats durations", () => {
  assert.equal(KitchenTimerState.format(0), "0:00");
  assert.equal(KitchenTimerState.format(65), "1:05");
  assert.equal(KitchenTimerState.format(3661), "1:01:01");
});
