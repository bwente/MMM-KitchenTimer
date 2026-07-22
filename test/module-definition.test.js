const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadDefinition() {
  let definition;
  const source = fs.readFileSync(
    path.join(__dirname, "..", "MMM-KitchenTimer.js"),
    "utf8"
  );
  const context = {
    Log: { info() {} },
    Module: {
      register(name, value) {
        assert.equal(name, "MMM-KitchenTimer");
        definition = value;
      }
    },
    KitchenTimerState: class {}
  };
  vm.runInNewContext(source, context);
  return definition;
}

test("loads its timer engine from the module-local URL", () => {
  const definition = loadDefinition();
  const scripts = definition.getScripts.call({
    file(relativePath) {
      return `/modules/MMM-KitchenTimer/${relativePath}`;
    }
  });

  assert.deepEqual(Array.from(scripts), [
    "/modules/MMM-KitchenTimer/lib/timer-state.js"
  ]);
});
