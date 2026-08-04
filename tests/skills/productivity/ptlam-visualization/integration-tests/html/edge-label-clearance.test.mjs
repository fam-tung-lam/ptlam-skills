import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const designSystem = new URL(
  "../../../../../../skills/productivity/ptlam-visualization/assets/html/design-system/",
  import.meta.url,
);

const [behaviorSource, diagrams, flows, example] = await Promise.all([
  readFile(new URL("behaviors/edge-label-clearance.js", designSystem), "utf8"),
  readFile(new URL("components/diagrams.css", designSystem), "utf8"),
  readFile(new URL("components/flows.css", designSystem), "utf8"),
  readFile(new URL("examples/diagram-learning.html", designSystem), "utf8"),
]);

const behavior = await import(
  `data:text/javascript;base64,${Buffer.from(behaviorSource).toString("base64")}`
);

const numericAttributes = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(/\b(x|y|width|height)="([\d.]+)"/g)].map(
      ([, name, value]) => [name, Number(value)],
    ),
  );

const scaledRect = (rect, scale) => ({
  left: rect.x * scale,
  top: rect.y * scale,
  width: rect.width * scale,
  height: rect.height * scale,
});

const percentRect = (style, width, height) => {
  const properties = Object.fromEntries(
    [...style.matchAll(/(left|top|width|height):\s*([\d.]+)%/g)].map(
      ([, name, value]) => [name, Number(value) / 100],
    ),
  );
  return {
    left: properties.left * width,
    top: properties.top * height,
    width: properties.width * width,
    height: properties.height * height,
  };
};

const semanticLevelSlices = () => {
  const starts = [
    ...example.matchAll(/data-ptv-semantic-zoom-level="[^"]+"/g),
  ].map((match) => match.index);
  return starts.map((start, index) =>
    example.slice(start, starts[index + 1] ?? example.indexOf("Pattern 02")),
  );
};

test("rectangle contract requires a real eight-pixel gap and containment", () => {
  const label = { left: 20, top: 20, width: 40, height: 20 };
  const exactlyEightAway = { left: 68, top: 16, width: 20, height: 30 };
  const sevenAway = { left: 67, top: 16, width: 20, height: 30 };
  const container = { left: 0, top: 0, width: 100, height: 80 };

  assert.equal(
    behavior.rectanglesHaveClearance(label, exactlyEightAway, 8),
    true,
  );
  assert.equal(behavior.rectanglesHaveClearance(label, sevenAway, 8), false);
  assert.equal(
    behavior.rectanglesHaveClearance(label, sevenAway, 2),
    false,
    "callers cannot lower the design-system minimum below eight pixels",
  );

  assert.deepEqual(
    behavior.validateEdgeLabelGeometry({
      labelRect: label,
      obstacleRects: [exactlyEightAway],
      containerRect: container,
    }),
    { clearance: 8, contained: true, clearsObstacles: true },
  );
  assert.equal(
    behavior.validateEdgeLabelGeometry({
      labelRect: { left: 70, top: 20, width: 40, height: 20 },
      obstacleRects: [],
      containerRect: container,
    }).contained,
    false,
  );
});

test("runtime records rendered pass and fail state without moving labels", () => {
  class FakeElement {
    constructor(rect, parts = {}) {
      this.rect = rect;
      this.parts = parts;
      this.attributes = new Map();
      this.listeners = new Map();
    }

    getBoundingClientRect() {
      return this.rect;
    }

    querySelectorAll(selector) {
      return this.parts[selector] ?? [];
    }

    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    }

    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    }

    removeAttribute(name) {
      this.attributes.delete(name);
    }

    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    }

    removeEventListener(type, listener) {
      if (this.listeners.get(type) === listener) this.listeners.delete(type);
    }

    dispatchEvent(event) {
      this.listeners.get(event.type)?.(event);
    }
  }

  class FakeResizeObserver {
    observe() {}
    disconnect() {}
  }

  const label = new FakeElement({ left: 20, top: 20, width: 30, height: 20 });
  const obstacle = new FakeElement({
    left: 70,
    top: 15,
    width: 20,
    height: 30,
  });
  const clearanceContainer = new FakeElement({
    left: 0,
    top: 0,
    width: 120,
    height: 80,
  });
  const clearanceRoot = new FakeElement(
    { left: 0, top: 0, width: 40, height: 80 },
    {
      "[data-ptv-edge-label-slot]": [label],
      "[data-ptv-edge-obstacle]": [obstacle],
      "[data-ptv-label-clearance-container]": [clearanceContainer],
    },
  );
  const document = new FakeElement(null, {
    "[data-ptv-label-clearance-root]": [clearanceRoot],
  });

  const controller = behavior.initPtvEdgeLabelClearance(document, {
    ResizeObserver: FakeResizeObserver,
  });
  assert.equal(clearanceRoot.getAttribute("data-ptv-label-clearance"), "pass");
  assert.equal(label.getAttribute("data-ptv-label-clearance"), "pass");
  assert.ok(
    label.rect.left + label.rect.width > clearanceRoot.rect.width,
    "the authored canvas, not the clipped scroller viewport, owns containment",
  );

  obstacle.rect = { left: 56, top: 15, width: 20, height: 30 };
  controller.measure();
  assert.equal(clearanceRoot.getAttribute("data-ptv-label-clearance"), "fail");
  assert.equal(label.getAttribute("data-ptv-label-clearance"), "fail");

  obstacle.rect = { left: 70, top: 15, width: 20, height: 30 };
  document.dispatchEvent({ type: "animationend" });
  assert.equal(
    clearanceRoot.getAttribute("data-ptv-label-clearance"),
    "pass",
    "settled animated layouts are measured again",
  );

  assert.deepEqual(label.rect, { left: 20, top: 20, width: 30, height: 20 });
  controller.destroy();
  assert.equal(document.listeners.has("animationend"), false);
  assert.equal(clearanceRoot.getAttribute("data-ptv-label-clearance"), null);
  assert.equal(label.getAttribute("data-ptv-label-clearance"), null);
});

test("every semantic-map label clears every rendered node at the narrow canvas", () => {
  const viewBoxWidth = 768;
  const viewBoxHeight = 448;
  const narrowCanvasWidth = 640;
  const scale = narrowCanvasWidth / viewBoxWidth;
  const container = {
    left: 0,
    top: 0,
    width: narrowCanvasWidth,
    height: viewBoxHeight * scale,
  };

  for (const level of semanticLevelSlices()) {
    const labels = [
      ...level.matchAll(
        /<foreignObject\b(?=[^>]*ptv-diagram-edge-label-slot)[^>]*>/g,
      ),
    ].map(([tag]) => scaledRect(numericAttributes(tag), scale));
    const obstacles = [
      ...level.matchAll(
        /<(?:div|button)\b(?=[^>]*data-ptv-edge-obstacle)[^>]*style="([^"]+)"[^>]*>/g,
      ),
    ].map(([, style]) => percentRect(style, container.width, container.height));

    assert.equal(labels.length, 3);
    assert.ok(obstacles.length >= 4);
    labels.forEach((labelRect) => {
      const result = behavior.validateEdgeLabelGeometry({
        labelRect,
        obstacleRects: obstacles,
        containerRect: container,
      });
      assert.equal(result.contained, true);
      assert.equal(result.clearsObstacles, true);
    });
  }
});

test("long Russian live-flow labels keep clearance inside the 320px scroller", () => {
  const flowStart = example.indexOf('<div class="ptv-flow-diagram"');
  const flowEnd = example.indexOf("</svg>", flowStart);
  const flowSvg = example.slice(flowStart, flowEnd);
  const scale = 320 / 380;
  const labels = [
    ...flowSvg.matchAll(
      /<foreignObject\b(?=[^>]*ptv-flow-edge-label-slot)[^>]*>/g,
    ),
  ].map(([tag]) => scaledRect(numericAttributes(tag), scale));
  const obstacles = [...flowSvg.matchAll(/<rect\b[^>]*x="[^"]+"[^>]*>/g)].map(
    ([tag]) => scaledRect(numericAttributes(tag), scale),
  );
  const container = {
    left: 0,
    top: 0,
    width: 320,
    height: 620 * scale,
  };

  assert.equal(labels.length, 3);
  assert.equal(obstacles.length, 4);
  assert.match(example, /передаёт запрос после проверки входных данных/);
  assert.match(example, /публикует событие только после фиксации заказа/);

  labels.forEach((labelRect) => {
    const result = behavior.validateEdgeLabelGeometry({
      labelRect,
      obstacleRects: obstacles,
      containerRect: container,
    });
    assert.equal(result.contained, true);
    assert.equal(result.clearsObstacles, true);
  });
});

test("relationship ownership synchronizes route and label without moving text", () => {
  assert.equal(
    (example.match(/class="ptv-flow-relationship"/g) ?? []).length,
    3,
  );
  assert.match(
    flows,
    /\.ptv-flow-relationship\.ptv-is-active\s+\.ptv-flow-edge[^}]*animation:/s,
  );
  assert.match(
    flows,
    /\.ptv-flow-relationship\.ptv-is-active\s+\.ptv-edge-label-box/s,
  );
  assert.doesNotMatch(
    flows.match(/\.ptv-edge-label-box\s*\{[^}]*\}/s)?.[0] ?? "",
    /animation|transform/,
  );

  for (const relationship of [
    "platform-uses",
    "platform-calls",
    "platform-telemetry",
    "backend-requests",
    "backend-routes",
    "backend-publishes",
    "orders-calls",
    "orders-writes",
    "orders-event",
  ]) {
    assert.equal(
      (
        example.match(
          new RegExp(`data-ptv-relationship="${relationship}"`, "g"),
        ) ?? []
      ).length,
      2,
      `${relationship} must pair one edge with one label slot`,
    );
  }

  assert.match(diagrams, /\.ptv-diagram-labels[^}]*z-index:\s*3/s);
  assert.match(diagrams, /\.ptv-edge-label-box[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(flows, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(flows, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(flows, /@media\s+print/);
  assert.match(flows, /overflow-x:\s*auto/);
});
