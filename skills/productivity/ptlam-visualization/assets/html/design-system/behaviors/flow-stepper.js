/*
 * Synchronized live-flow behavior for ptlam-visualization. Original work.
 *
 * Public interface:
 * - Root: data-ptv-flow, with optional data-ptv-flow-interval.
 * - Authored steps: data-ptv-flow-step, data-ptv-flow-active-node, optional
 *   data-ptv-flow-active-edge, and optional JSON data-ptv-flow-fields
 *   snapshots.
 * - Diagram: data-ptv-flow-node="name" and data-ptv-flow-edge="name".
 * - State: data-ptv-flow-field="name", data-ptv-flow-explanation, and
 *   data-ptv-flow-progress.
 * - Manual controls: native buttons with data-ptv-flow-next,
 *   data-ptv-flow-back, and data-ptv-flow-reset.
 * - Optional playback: a native button with data-ptv-flow-play and a native
 *   range input with data-ptv-flow-timeline.
 *
 * The authored diagram, state fields, and complete ordered step list remain
 * readable without JavaScript. Enhancement only synchronizes their current
 * state and never redraws the graph.
 */

const initializedFlows = new WeakSet();

const queryAll = (scope, selector) => {
  try {
    return Array.from(scope.querySelectorAll(selector));
  } catch {
    return [];
  }
};

const ownedBy = (element, flow) => {
  try {
    return (
      typeof element?.closest !== "function" ||
      element.closest("[data-ptv-flow]") === flow
    );
  } catch {
    return false;
  }
};

const ownedAll = (flow, selector) =>
  queryAll(flow, selector).filter((element) => ownedBy(element, flow));

const ownedOne = (flow, selector) => ownedAll(flow, selector)[0] ?? null;

const listen = (target, type, listener) => {
  if (
    typeof target?.addEventListener !== "function" ||
    typeof target?.removeEventListener !== "function"
  ) {
    return null;
  }

  const guardedListener = (event) => {
    try {
      listener(event);
    } catch {
      // A malformed optional control must not break the readable document.
    }
  };
  target.addEventListener(type, guardedListener);
  return () => target.removeEventListener(type, guardedListener);
};

const namedElements = (elements, attribute) => {
  const byName = new Map();
  for (const element of elements) {
    const name = element.getAttribute?.(attribute)?.trim();
    if (!name) continue;
    const matches = byName.get(name) ?? [];
    matches.push(element);
    byName.set(name, matches);
  }
  return byName;
};

const parseFields = (step) => {
  const source = step.getAttribute?.("data-ptv-flow-fields");
  if (!source) return {};

  try {
    const fields = JSON.parse(source);
    if (!fields || Array.isArray(fields) || typeof fields !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(fields)
        .filter(([, value]) =>
          ["string", "number", "boolean"].includes(typeof value),
        )
        .map(([name, value]) => [name, String(value)]),
    );
  } catch {
    return {};
  }
};

const explanationFor = (step) =>
  step.getAttribute?.("data-ptv-flow-explanation-text")?.trim() ||
  String(step.textContent ?? "").trim();

const toggleCurrent = (element, active) => {
  element.classList?.toggle("ptv-is-active", active);
  if (active) element.setAttribute?.("aria-current", "step");
  else element.removeAttribute?.("aria-current");
};

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

const progressText = (flow, current, total) =>
  (
    flow.getAttribute?.("data-ptv-flow-progress-template") ??
    "Step {current} of {total}"
  )
    .replaceAll("{current}", String(current))
    .replaceAll("{total}", String(total));

const defaultScheduler = Object.freeze({
  setInterval(callback, delay) {
    return globalThis.setInterval(callback, delay);
  },
  clearInterval(handle) {
    globalThis.clearInterval(handle);
  },
});

const intervalFor = (flow) => {
  const parsed = Number.parseInt(
    flow.getAttribute?.("data-ptv-flow-interval") ?? "",
    10,
  );
  return Number.isFinite(parsed) && parsed >= 500 ? parsed : 1800;
};

const setupFlow = (flow, scheduler) => {
  const authoredSteps = ownedAll(flow, "[data-ptv-flow-step]");
  const nodes = namedElements(
    ownedAll(flow, "[data-ptv-flow-node]"),
    "data-ptv-flow-node",
  );
  const edges = namedElements(
    ownedAll(flow, "[data-ptv-flow-edge]"),
    "data-ptv-flow-edge",
  );
  const fields = namedElements(
    ownedAll(flow, "[data-ptv-flow-field]"),
    "data-ptv-flow-field",
  );

  const initialFields = Object.fromEntries(
    [...fields.entries()].map(([name, elements]) => [
      name,
      String(elements[0]?.textContent ?? ""),
    ]),
  );
  let accumulatedFields = { ...initialFields };
  const steps = authoredSteps
    .map((element) => {
      const nodeName = element
        .getAttribute?.("data-ptv-flow-active-node")
        ?.trim();
      if (!nodeName || !nodes.has(nodeName)) return null;

      accumulatedFields = {
        ...accumulatedFields,
        ...parseFields(element),
      };
      const edgeName = element
        .getAttribute?.("data-ptv-flow-active-edge")
        ?.trim();
      return {
        element,
        nodeName,
        edgeName: edgeName && edges.has(edgeName) ? edgeName : null,
        fields: { ...accumulatedFields },
        explanation: explanationFor(element),
      };
    })
    .filter(Boolean);

  const next = ownedOne(flow, "button[data-ptv-flow-next]");
  const back = ownedOne(flow, "button[data-ptv-flow-back]");
  const reset = ownedOne(flow, "button[data-ptv-flow-reset]");
  const play = ownedOne(flow, "button[data-ptv-flow-play]");
  const timeline = ownedOne(flow, "input[data-ptv-flow-timeline]");
  const explanation = ownedOne(flow, "[data-ptv-flow-explanation]");
  const progress = ownedOne(flow, "[data-ptv-flow-progress]");

  if (steps.length === 0 || !next || !back || !reset) return null;

  const allNodes = [...nodes.values()].flat();
  const allEdges = [...edges.values()].flat();
  const original = {
    explanation: explanation?.textContent ?? "",
    progress: progress?.textContent ?? "",
    play: play?.textContent ?? "",
    fields: new Map(
      [...fields.entries()].flatMap(([name, elements]) =>
        elements.map((element) => [element, initialFields[name]]),
      ),
    ),
  };

  let index = 0;
  let playbackHandle = null;
  const removers = [];

  const setPlayback = (playing) => {
    if (!play) return;

    if (!playing && playbackHandle !== null) {
      scheduler.clearInterval(playbackHandle);
      playbackHandle = null;
    }

    play.setAttribute?.("aria-pressed", String(playing));
    play.textContent =
      play.getAttribute?.(
        playing ? "data-ptv-flow-pause-label" : "data-ptv-flow-play-label",
      ) ?? (playing ? "Pause" : "Play");
  };

  const render = () => {
    const step = steps[index];
    allNodes.forEach((node) =>
      toggleCurrent(
        node,
        node.getAttribute?.("data-ptv-flow-node") === step.nodeName,
      ),
    );
    allEdges.forEach((edge) =>
      toggleCurrent(
        edge,
        Boolean(step.edgeName) &&
          edge.getAttribute?.("data-ptv-flow-edge") === step.edgeName,
      ),
    );
    steps.forEach(({ element }, stepIndex) => {
      const active = stepIndex === index;
      toggleCurrent(element, active);
      element.hidden = !active;
    });

    for (const [name, elements] of fields) {
      const value = step.fields[name] ?? initialFields[name] ?? "";
      elements.forEach((field) => {
        field.textContent = value;
      });
    }

    if (explanation) explanation.textContent = step.explanation;
    if (progress) {
      progress.textContent = progressText(flow, index + 1, steps.length);
    }
    if (timeline) {
      timeline.min = "0";
      timeline.max = String(steps.length - 1);
      timeline.value = String(index);
      timeline.setAttribute?.(
        "aria-valuetext",
        progressText(flow, index + 1, steps.length),
      );
    }

    back.disabled = index === 0;
    reset.disabled = index === 0;
    next.disabled = index === steps.length - 1;
  };

  const goTo = (nextIndex) => {
    index = clamp(nextIndex, 0, steps.length - 1);
    render();
  };

  const stopPlayback = () => setPlayback(false);
  const addListener = (target, type, listener) => {
    const remove = listen(target, type, listener);
    if (remove) removers.push(remove);
  };

  addListener(next, "click", () => {
    stopPlayback();
    goTo(index + 1);
  });
  addListener(back, "click", () => {
    stopPlayback();
    goTo(index - 1);
  });
  addListener(reset, "click", () => {
    stopPlayback();
    goTo(0);
  });
  addListener(timeline, "input", () => {
    stopPlayback();
    goTo(Number.parseInt(timeline.value, 10) || 0);
  });
  addListener(play, "click", () => {
    if (playbackHandle !== null) {
      stopPlayback();
      return;
    }

    if (index === steps.length - 1) goTo(0);
    setPlayback(true);
    try {
      playbackHandle = scheduler.setInterval(() => {
        if (index >= steps.length - 1) {
          stopPlayback();
          return;
        }
        goTo(index + 1);
        if (index === steps.length - 1) stopPlayback();
      }, intervalFor(flow));
    } catch {
      stopPlayback();
    }
  });

  explanation?.setAttribute?.("role", "status");
  explanation?.setAttribute?.("aria-live", "polite");
  explanation?.setAttribute?.("aria-atomic", "true");
  progress?.setAttribute?.("aria-live", "polite");
  play?.setAttribute?.("aria-pressed", "false");
  flow.setAttribute("data-ptv-flow-enhanced", "");
  render();

  return () => {
    stopPlayback();
    removers.reverse().forEach((remove) => remove());
    flow.removeAttribute?.("data-ptv-flow-enhanced");
    [...authoredSteps, ...allNodes, ...allEdges].forEach((element) => {
      element.classList?.toggle("ptv-is-active", false);
      element.removeAttribute?.("aria-current");
    });
    authoredSteps.forEach((step) => {
      step.hidden = false;
    });
    for (const [field, value] of original.fields) field.textContent = value;
    if (explanation) explanation.textContent = original.explanation;
    if (progress) progress.textContent = original.progress;
    if (play) play.textContent = original.play;
  };
};

/**
 * Enhance every valid live-flow below `root`.
 *
 * The scheduler adapter is optional and exists only at the timer seam. The
 * returned controller removes listeners, stops playback, and restores the
 * authored no-JavaScript reading state.
 */
export function initPtvFlowSteppers(
  root = globalThis.document,
  { scheduler = defaultScheduler } = {},
) {
  if (!root || typeof root.querySelectorAll !== "function") {
    return Object.freeze({ destroy() {} });
  }

  const safeScheduler =
    typeof scheduler?.setInterval === "function" &&
    typeof scheduler?.clearInterval === "function"
      ? scheduler
      : defaultScheduler;
  const cleanups = [];

  for (const flow of queryAll(root, "[data-ptv-flow]")) {
    if (initializedFlows.has(flow)) continue;
    try {
      const cleanup = setupFlow(flow, safeScheduler);
      if (!cleanup) continue;
      initializedFlows.add(flow);
      cleanups.push(() => {
        try {
          cleanup();
        } finally {
          initializedFlows.delete(flow);
        }
      });
    } catch {
      // One malformed flow must not prevent other flows from enhancing.
    }
  }

  let destroyed = false;
  return Object.freeze({
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cleanups.reverse().forEach((cleanup) => {
        try {
          cleanup();
        } catch {
          // Teardown remains isolated and best-effort.
        }
      });
    },
  });
}

if (typeof document !== "undefined") {
  initPtvFlowSteppers(document);
}
