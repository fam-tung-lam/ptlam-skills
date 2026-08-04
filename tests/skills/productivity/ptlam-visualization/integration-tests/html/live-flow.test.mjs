import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const designSystem = new URL(
  "../../../../../../skills/productivity/ptlam-visualization/assets/html/design-system/",
  import.meta.url,
);

const behaviorSource = await readFile(
  new URL("behaviors/flow-stepper.js", designSystem),
  "utf8",
);
const flowStyles = await readFile(
  new URL("components/flows.css", designSystem),
  "utf8",
);
const tokens = await readFile(
  new URL("tokens/tokens.css", designSystem),
  "utf8",
);
const { initPtvFlowSteppers } = await import(
  `data:text/javascript;base64,${Buffer.from(behaviorSource).toString("base64")}`
);

class FakeClassList {
  #names = new Set();

  toggle(name, force) {
    const enabled = force === undefined ? !this.#names.has(name) : force;
    if (enabled) this.#names.add(name);
    else this.#names.delete(name);
    return enabled;
  }

  contains(name) {
    return this.#names.has(name);
  }
}

class FakeElement {
  constructor(attributes = {}, textContent = "") {
    this.attributes = new Map(
      Object.entries(attributes).map(([name, value]) => [name, String(value)]),
    );
    this.classList = new FakeClassList();
    this.textContent = textContent;
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this.min = "";
    this.max = "";
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter(
        (candidate) => candidate !== listener,
      ),
    );
  }

  emit(type) {
    const event = {
      currentTarget: this,
      target: this,
      preventDefault() {},
    };
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }
}

class FakeFlow extends FakeElement {
  constructor(parts, attributes = {}) {
    super({ "data-ptv-flow": "", ...attributes });
    this.parts = parts;
  }

  querySelectorAll(selector) {
    return this.parts[selector] ?? [];
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

function makeScheduler() {
  let callback = null;
  return {
    setInterval(nextCallback) {
      callback = nextCallback;
      return 7;
    },
    clearInterval() {
      callback = null;
    },
    tick() {
      callback?.();
    },
    get running() {
      return callback !== null;
    },
  };
}

function makeFixture() {
  const nodes = ["messages", "model", "answer"].map(
    (name) => new FakeElement({ "data-ptv-flow-node": name }),
  );
  const edges = ["send", "return"].map(
    (name) => new FakeElement({ "data-ptv-flow-edge": name }),
  );
  const steps = [
    new FakeElement(
      {
        "data-ptv-flow-step": "",
        "data-ptv-flow-active-node": "messages",
        "data-ptv-flow-fields": '{"calls":"0","budget":"90"}',
      },
      "The message array is ready.",
    ),
    new FakeElement(
      {
        "data-ptv-flow-step": "",
        "data-ptv-flow-active-node": "model",
        "data-ptv-flow-active-edge": "send",
        "data-ptv-flow-fields": '{"calls":"1","budget":"89"}',
      },
      "The model receives the whole array.",
    ),
    new FakeElement(
      {
        "data-ptv-flow-step": "",
        "data-ptv-flow-active-node": "answer",
        "data-ptv-flow-active-edge": "return",
        "data-ptv-flow-fields": '{"calls":"2","budget":"88"}',
      },
      "The final answer returns.",
    ),
  ];
  const calls = new FakeElement({ "data-ptv-flow-field": "calls" }, "0");
  const budget = new FakeElement({ "data-ptv-flow-field": "budget" }, "90");
  const explanation = new FakeElement({ "data-ptv-flow-explanation": "" });
  const progress = new FakeElement({ "data-ptv-flow-progress": "" });
  const next = new FakeElement({ "data-ptv-flow-next": "" }, "Next");
  const back = new FakeElement({ "data-ptv-flow-back": "" }, "Back");
  const reset = new FakeElement({ "data-ptv-flow-reset": "" }, "Reset");
  const play = new FakeElement(
    {
      "data-ptv-flow-play": "",
      "data-ptv-flow-play-label": "Play",
      "data-ptv-flow-pause-label": "Pause",
    },
    "Play",
  );
  const timeline = new FakeElement({ "data-ptv-flow-timeline": "" });

  const flow = new FakeFlow(
    {
      "[data-ptv-flow-step]": steps,
      "[data-ptv-flow-node]": nodes,
      "[data-ptv-flow-edge]": edges,
      "[data-ptv-flow-field]": [calls, budget],
      "[data-ptv-flow-explanation]": [explanation],
      "[data-ptv-flow-progress]": [progress],
      "button[data-ptv-flow-next]": [next],
      "button[data-ptv-flow-back]": [back],
      "button[data-ptv-flow-reset]": [reset],
      "button[data-ptv-flow-play]": [play],
      "input[data-ptv-flow-timeline]": [timeline],
    },
    { "data-ptv-flow-interval": "1500" },
  );
  const root = {
    querySelectorAll(selector) {
      return selector === "[data-ptv-flow]" ? [flow] : [];
    },
  };

  return {
    root,
    flow,
    nodes,
    edges,
    steps,
    fields: { calls, budget },
    explanation,
    progress,
    controls: { next, back, reset, play, timeline },
  };
}

test("manual controls synchronize the stable flowchart and state panel", () => {
  const fixture = makeFixture();
  const scheduler = makeScheduler();
  const controller = initPtvFlowSteppers(fixture.root, { scheduler });

  assert.equal(fixture.flow.hasAttribute("data-ptv-flow-enhanced"), true);
  assert.equal(fixture.nodes[0].classList.contains("ptv-is-active"), true);
  assert.equal(
    fixture.edges.some((edge) => edge.classList.contains("ptv-is-active")),
    false,
  );
  assert.equal(fixture.fields.calls.textContent, "0");
  assert.equal(fixture.fields.budget.textContent, "90");
  assert.equal(fixture.explanation.textContent, "The message array is ready.");
  assert.equal(fixture.progress.textContent, "Step 1 of 3");
  assert.equal(fixture.controls.timeline.value, "0");
  assert.equal(fixture.controls.timeline.max, "2");
  assert.equal(fixture.controls.back.disabled, true);

  fixture.controls.next.emit("click");

  assert.equal(fixture.nodes[1].classList.contains("ptv-is-active"), true);
  assert.equal(fixture.nodes[0].classList.contains("ptv-is-active"), false);
  assert.equal(fixture.edges[0].classList.contains("ptv-is-active"), true);
  assert.equal(fixture.nodes[1].getAttribute("aria-current"), "step");
  assert.equal(fixture.edges[0].getAttribute("aria-current"), "step");
  assert.equal(fixture.fields.calls.textContent, "1");
  assert.equal(fixture.fields.budget.textContent, "89");
  assert.equal(
    fixture.explanation.textContent,
    "The model receives the whole array.",
  );
  assert.equal(fixture.steps[1].hidden, false);
  assert.equal(fixture.steps[0].hidden, true);
  assert.equal(fixture.progress.textContent, "Step 2 of 3");

  fixture.controls.timeline.value = "2";
  fixture.controls.timeline.emit("input");
  assert.equal(fixture.nodes[2].classList.contains("ptv-is-active"), true);
  assert.equal(fixture.fields.calls.textContent, "2");
  assert.equal(fixture.controls.next.disabled, true);

  fixture.controls.back.emit("click");
  assert.equal(fixture.progress.textContent, "Step 2 of 3");

  fixture.controls.reset.emit("click");
  assert.equal(fixture.progress.textContent, "Step 1 of 3");

  controller.destroy();
  fixture.controls.next.emit("click");
  assert.equal(fixture.progress.textContent, "");
  assert.equal(
    fixture.steps.every((step) => step.hidden === false),
    true,
  );
});

test("optional autoplay is secondary, stoppable, and settles at the final step", () => {
  const fixture = makeFixture();
  const scheduler = makeScheduler();
  initPtvFlowSteppers(fixture.root, { scheduler });

  fixture.controls.play.emit("click");
  assert.equal(fixture.controls.play.getAttribute("aria-pressed"), "true");
  assert.equal(fixture.controls.play.textContent, "Pause");
  assert.equal(scheduler.running, true);

  scheduler.tick();
  assert.equal(fixture.progress.textContent, "Step 2 of 3");
  scheduler.tick();
  assert.equal(fixture.progress.textContent, "Step 3 of 3");
  assert.equal(fixture.controls.play.getAttribute("aria-pressed"), "false");
  assert.equal(fixture.controls.play.textContent, "Play");
  assert.equal(scheduler.running, false);
});

test("flow presentation keeps diagrams connected, responsive, printable, and calm on request", () => {
  for (const className of [
    "ptv-flow",
    "ptv-flow-diagram",
    "ptv-flow-node",
    "ptv-flow-edge",
    "ptv-flow-edge-label",
    "ptv-flow-state",
    "ptv-flow-controls",
    "ptv-flow-timeline",
  ]) {
    assert.match(flowStyles, new RegExp(`\\.${className}(?![a-z0-9-])`));
  }

  assert.match(flowStyles, /\.ptv-flow-edge\.ptv-is-active[^}]*animation:/s);
  assert.match(flowStyles, /@keyframes\s+ptv-flow-edge-travel/);
  assert.match(flowStyles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(
    flowStyles,
    /\.ptv-flow-edge\.ptv-is-active[^}]*animation:\s*none/s,
  );
  assert.match(flowStyles, /@media\s*\(max-width:\s*48rem\)/);
  assert.match(flowStyles, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(flowStyles, /overflow-x:\s*auto/);
  assert.match(flowStyles, /@media\s+print/);
  assert.match(flowStyles, /\.ptv-flow-controls[^}]*display:\s*none/s);
  assert.doesNotMatch(flowStyles, /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl|oklch)\(/i);
  assert.doesNotMatch(flowStyles, /@import\b|url\(\s*["']?(?:https?:)?\/\//i);

  const publicTokens = new Set(
    [...tokens.matchAll(/(--ptv-[a-z0-9-]+)\s*:/g)].map((match) => match[1]),
  );
  for (const [, token] of flowStyles.matchAll(/var\((--[a-z0-9-]+)/g)) {
    assert.ok(publicTokens.has(token), `Unknown design token: ${token}`);
  }
});

test("progressive enhancement leaves authored steps readable without JavaScript", () => {
  assert.match(
    flowStyles,
    /\[data-ptv-flow-enhanced\][^}]*\.ptv-flow-step:not\(\.ptv-is-active\)[^}]*display:\s*none/s,
  );
  assert.doesNotMatch(
    flowStyles,
    /^\s*\.ptv-flow-step:not\(\.ptv-is-active\)[^{]*\{[^}]*display:\s*none/ms,
  );
  assert.match(
    flowStyles,
    /\.ptv-flow:not\(\[data-ptv-flow-enhanced\]\)[^}]*\.ptv-flow-controls[^}]*display:\s*none/s,
  );
  assert.match(
    behaviorSource,
    /setAttribute\("data-ptv-flow-enhanced",\s*""\)/,
  );
  assert.match(behaviorSource, /export function initPtvFlowSteppers/);
});
