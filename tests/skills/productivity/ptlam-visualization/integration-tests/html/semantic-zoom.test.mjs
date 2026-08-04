import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const designSystem = new URL(
  "../../../../../../skills/productivity/ptlam-visualization/assets/html/design-system/",
  import.meta.url,
);

const [tokens, diagrams, behaviorSource] = await Promise.all([
  readFile(new URL("tokens/tokens.css", designSystem), "utf8"),
  readFile(new URL("components/diagrams.css", designSystem), "utf8"),
  readFile(new URL("behaviors/semantic-zoom.js", designSystem), "utf8"),
]);

const behaviorModule = await import(
  `data:text/javascript;base64,${Buffer.from(behaviorSource).toString("base64")}`
);

const publicTokens = new Set(
  [...tokens.matchAll(/(--ptv-[a-z0-9-]+)\s*:/g)].map((match) => match[1]),
);

const blockAfter = (source, selector) => {
  const selectorStart = source.indexOf(selector);
  assert.notEqual(selectorStart, -1, `Missing selector: ${selector}`);
  const openingBrace = source.indexOf("{", selectorStart);
  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(openingBrace + 1, index);
  }
  assert.fail(`Unclosed block for selector: ${selector}`);
};

const selectorPattern = /^(?:([a-z]+))?(?:\[([^\]=]+)(?:="([^"]*)")?\])?$/i;

function matchesSelector(element, selector) {
  const match = selector.match(selectorPattern);
  if (!match) throw new Error(`Unsupported test selector: ${selector}`);
  const [, tagName, attribute, expectedValue] = match;
  if (tagName && element.tagName.toLowerCase() !== tagName.toLowerCase()) {
    return false;
  }
  if (!attribute) return true;
  if (!element.hasAttribute(attribute)) return false;
  return (
    expectedValue === undefined ||
    element.getAttribute(attribute) === expectedValue
  );
}

function assignDocument(element, document) {
  element.ownerDocument = document;
  element.children.forEach((child) => assignDocument(child, document));
}

class FakeClassList {
  #classes = new Set();

  add(...names) {
    names.forEach((name) => this.#classes.add(name));
  }

  remove(...names) {
    names.forEach((name) => this.#classes.delete(name));
  }

  toggle(name, force) {
    const enabled = force === undefined ? !this.#classes.has(name) : force;
    if (enabled) this.#classes.add(name);
    else this.#classes.delete(name);
    return enabled;
  }

  contains(name) {
    return this.#classes.has(name);
  }
}

class FakeElement {
  constructor(tagName, attributes = {}, textContent = "") {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map(
      Object.entries(attributes).map(([name, value]) => [name, String(value)]),
    );
    this.textContent = textContent;
    this.children = [];
    this.parentElement = null;
    this.ownerDocument = null;
    this.classList = new FakeClassList();
    this.hidden = false;
    this.disabled = false;
    this.tabIndex = 0;
    this.isContentEditable = false;
    this.listeners = new Map();
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
      if (this.ownerDocument) assignDocument(child, this.ownerDocument);
    }
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

  emit(type, properties = {}) {
    const event = {
      type,
      target: this,
      currentTarget: this,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      ...properties,
    };
    for (const listener of this.listeners.get(type) ?? []) listener(event);
    return event;
  }

  focus() {
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
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

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  matches(selector) {
    return matchesSelector(this, selector);
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (current.matches(selector)) return current;
      current = current.parentElement;
    }
    return null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (element) => {
      for (const child of element.children) {
        if (child.matches(selector)) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

class FakeDocument {
  constructor() {
    this.nodeType = 9;
    this.documentElement = new FakeElement("html");
    this.defaultView = {
      matchMedia: () => ({ matches: false }),
    };
    this.activeElement = null;
    assignDocument(this.documentElement, this);
  }

  querySelectorAll(selector) {
    const matches = this.documentElement.matches(selector)
      ? [this.documentElement]
      : [];
    return matches.concat(this.documentElement.querySelectorAll(selector));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

const element = (tagName, attributes, textContent) =>
  new FakeElement(tagName, attributes, textContent);

const actionButton = (attributes, textContent) =>
  element("button", { type: "button", ...attributes }, textContent);

function makeHierarchy() {
  const document = new FakeDocument();
  const body = element("body");
  document.documentElement.append(body);

  const root = element("section", {
    "data-ptv-semantic-zoom": "",
    "data-ptv-semantic-zoom-initial": "product",
    "data-ptv-semantic-zoom-status-template": "Сейчас {label}. Путь: {path}.",
  });
  const toolbar = element("header");
  const productCrumb = actionButton(
    { "data-ptv-semantic-zoom-target": "product" },
    "Product",
  );
  const backendCrumb = actionButton(
    { "data-ptv-semantic-zoom-target": "backend" },
    "Backend",
  );
  const frontendCrumb = actionButton(
    { "data-ptv-semantic-zoom-target": "frontend" },
    "Frontend",
  );
  const ordersCrumb = actionButton(
    { "data-ptv-semantic-zoom-target": "orders" },
    "Orders service",
  );
  const out = actionButton({ "data-ptv-semantic-zoom-out": "" }, "Zoom out");
  const status = element(
    "p",
    { "data-ptv-semantic-zoom-status": "" },
    "All levels",
  );
  toolbar.append(
    productCrumb,
    backendCrumb,
    frontendCrumb,
    ordersCrumb,
    out,
    status,
  );

  const viewport = element("div");
  const product = element("section", {
    "data-ptv-semantic-zoom-level": "product",
    "data-ptv-semantic-zoom-label": "Store platform",
  });
  const openBackend = actionButton(
    { "data-ptv-semantic-zoom-in": "backend" },
    "Open backend",
  );
  const openFrontend = actionButton(
    { "data-ptv-semantic-zoom-in": "frontend" },
    "Open frontend",
  );
  product.append(
    openBackend,
    openFrontend,
    element("p", {}, "Connected product map"),
  );

  const backend = element("section", {
    "data-ptv-semantic-zoom-level": "backend",
    "data-ptv-semantic-zoom-parent": "product",
    "data-ptv-semantic-zoom-label": "Backend services",
  });
  const openOrders = actionButton(
    { "data-ptv-semantic-zoom-in": "orders" },
    "Open orders service",
  );
  backend.append(openOrders, element("p", {}, "Connected backend map"));

  const frontend = element("section", {
    "data-ptv-semantic-zoom-level": "frontend",
    "data-ptv-semantic-zoom-parent": "product",
    "data-ptv-semantic-zoom-label": "Frontend applications",
  });
  frontend.append(element("p", {}, "Connected frontend map"));

  const orders = element("section", {
    "data-ptv-semantic-zoom-level": "orders",
    "data-ptv-semantic-zoom-parent": "backend",
    "data-ptv-semantic-zoom-label": "Orders service internals",
  });
  orders.append(element("p", {}, "Connected component map"));

  viewport.append(product, backend, frontend, orders);
  root.append(toolbar, viewport);
  body.append(root);

  return {
    backend,
    backendCrumb,
    document,
    frontend,
    frontendCrumb,
    openBackend,
    openOrders,
    orders,
    ordersCrumb,
    out,
    product,
    productCrumb,
    root,
    status,
  };
}

test("diagram components support connected maps and arbitrary semantic levels", () => {
  for (const className of [
    "ptv-semantic-zoom",
    "ptv-semantic-zoom-toolbar",
    "ptv-semantic-zoom-breadcrumbs",
    "ptv-semantic-zoom-trail",
    "ptv-semantic-zoom-crumb",
    "ptv-semantic-zoom-out",
    "ptv-semantic-zoom-status",
    "ptv-semantic-zoom-viewport",
    "ptv-semantic-zoom-level",
    "ptv-diagram-region",
    "ptv-diagram-canvas",
    "ptv-diagram-connections",
    "ptv-diagram-edge",
    "ptv-diagram-edge-label",
    "ptv-diagram-boundary",
    "ptv-diagram-boundary-button",
    "ptv-diagram-node",
    "ptv-diagram-node-button",
  ]) {
    assert.match(diagrams, new RegExp(`\\.${className}(?![a-z0-9-])`));
  }

  assert.match(diagrams, /\.ptv-diagram-connections[^}]*position:\s*absolute/s);
  assert.match(diagrams, /\.ptv-diagram-edge[^}]*stroke:\s*currentcolor/s);
  assert.match(
    diagrams,
    /\.ptv-diagram-edge-label[^}]*font-weight:\s*var\(--ptv-weight-regular\)/s,
  );
  assert.match(
    diagrams,
    /\.ptv-diagram-boundary-button,\s*\.ptv-diagram-node-button\s*\{[^}]*cursor:\s*zoom-in/s,
  );
});

test("semantic zoom shows direction, focus, reduced motion, and printable levels", () => {
  assert.match(diagrams, /@keyframes\s+ptv-semantic-zoom-in[^]*scale\(0\.78\)/);
  assert.match(
    diagrams,
    /@keyframes\s+ptv-semantic-zoom-out[^]*scale\(1\.22\)/,
  );
  assert.match(diagrams, /\.ptv-is-entering-from-parent/);
  assert.match(diagrams, /\.ptv-is-entering-from-child/);
  assert.match(diagrams, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(diagrams, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(
    diagrams,
    /@media\s+print[^]*\.ptv-semantic-zoom-level\[hidden\][^]*display:\s*block\s*!important/,
  );
  assert.match(diagrams, /:focus-visible/);
  assert.match(
    diagrams,
    /li:has\(\.ptv-semantic-zoom-crumb\[hidden\]\)[^{]*\{[^}]*display:\s*none/s,
  );
});

test("diagram components contain wide maps instead of overflowing the page", () => {
  for (const selector of [
    ".ptv-semantic-zoom",
    ".ptv-semantic-zoom-toolbar",
    ".ptv-semantic-zoom-viewport",
    ".ptv-semantic-zoom-level",
    ".ptv-diagram-region",
  ]) {
    assert.match(blockAfter(diagrams, selector), /min-inline-size:\s*0/);
  }
  assert.match(
    blockAfter(diagrams, ".ptv-diagram-region"),
    /overflow-x:\s*auto/,
  );
  assert.match(diagrams, /@media\s*\(max-width:\s*30rem\)/);
  assert.doesNotMatch(
    blockAfter(diagrams, ".ptv-semantic-zoom-level"),
    /display:\s*none/,
    "unenhanced levels must remain readable",
  );
});

test("diagram CSS uses only the public tokens and local platform features", () => {
  const references = [...diagrams.matchAll(/var\((--[a-z0-9-]+)/g)].map(
    (match) => match[1],
  );
  assert.ok(references.length > 0);
  for (const reference of references) {
    assert.ok(publicTokens.has(reference), `Unknown token ${reference}`);
  }
  assert.doesNotMatch(diagrams, /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl|oklch)\(/i);
  assert.doesNotMatch(diagrams, /@import\b|url\(\s*["']?(?:https?:)?\/\//i);
});

test("behavior navigates any parent-child hierarchy and maintains its active path", () => {
  const fixture = makeHierarchy();
  const controller = behaviorModule.initPtvSemanticZoom(fixture.document);

  assert.equal(
    fixture.root.getAttribute("data-ptv-semantic-zoom-current"),
    "product",
  );
  assert.equal(fixture.product.hidden, false);
  assert.equal(fixture.backend.hidden, true);
  assert.equal(fixture.frontend.hidden, true);
  assert.equal(fixture.orders.hidden, true);
  assert.equal(fixture.productCrumb.hidden, false);
  assert.equal(fixture.backendCrumb.hidden, true);
  assert.equal(fixture.out.disabled, true);
  assert.equal(
    fixture.status.textContent,
    "Сейчас Store platform. Путь: Store platform.",
  );

  fixture.openBackend.emit("click");
  assert.equal(
    fixture.root.getAttribute("data-ptv-semantic-zoom-current"),
    "backend",
  );
  assert.equal(fixture.backend.hidden, false);
  assert.equal(fixture.product.hidden, true);
  assert.equal(fixture.backendCrumb.hidden, false);
  assert.equal(fixture.frontendCrumb.hidden, true);
  assert.equal(fixture.backendCrumb.getAttribute("aria-current"), "location");
  assert.equal(fixture.document.activeElement, fixture.backend);
  assert.equal(
    fixture.backend.classList.contains("ptv-is-entering-from-parent"),
    true,
  );

  fixture.frontendCrumb.emit("click");
  assert.equal(
    fixture.root.getAttribute("data-ptv-semantic-zoom-current"),
    "backend",
    "a sibling cannot be entered through breadcrumb backtracking",
  );

  fixture.openOrders.emit("click");
  assert.equal(
    fixture.root.getAttribute("data-ptv-semantic-zoom-current"),
    "orders",
  );
  assert.equal(fixture.ordersCrumb.hidden, false);
  fixture.backendCrumb.emit("click");
  assert.equal(
    fixture.root.getAttribute("data-ptv-semantic-zoom-current"),
    "backend",
  );
  assert.equal(
    fixture.backend.classList.contains("ptv-is-entering-from-child"),
    true,
  );
  assert.equal(fixture.document.activeElement, fixture.backendCrumb);

  fixture.out.emit("click");
  assert.equal(
    fixture.root.getAttribute("data-ptv-semantic-zoom-current"),
    "product",
  );
  assert.equal(fixture.document.activeElement, fixture.openBackend);

  controller.destroy();
  assert.equal(
    fixture.root.hasAttribute("data-ptv-semantic-zoom-current"),
    false,
  );
  assert.equal(fixture.root.classList.contains("ptv-is-enhanced"), false);
  assert.equal(fixture.product.hidden, false);
  assert.equal(fixture.backend.hidden, false);
  assert.equal(fixture.frontend.hidden, false);
  assert.equal(fixture.orders.hidden, false);
  assert.equal(fixture.status.textContent, "All levels");
});

test("Escape zooms out, native action buttons are required, and invalid roots stay readable", () => {
  const fixture = makeHierarchy();
  const malformed = element("section", { "data-ptv-semantic-zoom": "" });
  const duplicateA = element("section", {
    "data-ptv-semantic-zoom-level": "same",
    "data-ptv-semantic-zoom-label": "First",
  });
  const duplicateB = element("section", {
    "data-ptv-semantic-zoom-level": "same",
    "data-ptv-semantic-zoom-label": "Second",
  });
  malformed.append(duplicateA, duplicateB);
  fixture.document.documentElement.children[0].append(malformed);

  const submitLike = element(
    "button",
    { "data-ptv-semantic-zoom-in": "frontend" },
    "Unsafe implicit submit",
  );
  fixture.product.append(submitLike);

  const controller = behaviorModule.initPtvSemanticZoom(fixture.document);
  submitLike.emit("click");
  assert.equal(
    fixture.root.getAttribute("data-ptv-semantic-zoom-current"),
    "product",
  );

  fixture.openBackend.emit("click");
  const event = fixture.root.emit("keydown", {
    key: "Escape",
    target: fixture.backend,
  });
  assert.equal(event.defaultPrevented, true);
  assert.equal(
    fixture.root.getAttribute("data-ptv-semantic-zoom-current"),
    "product",
  );
  assert.equal(duplicateA.hidden, false);
  assert.equal(duplicateB.hidden, false);
  assert.equal(malformed.classList.contains("ptv-is-enhanced"), false);

  controller.destroy();
});

test("behavior is local, progressive, and free of persistence or generated markup", () => {
  assert.match(behaviorSource, /export function initPtvSemanticZoom/);
  assert.match(behaviorSource, /data-ptv-semantic-zoom-parent/);
  assert.match(behaviorSource, /data-ptv-semantic-zoom-current/);
  assert.match(behaviorSource, /button\[data-ptv-semantic-zoom-in\]/);
  assert.match(behaviorSource, /event\.key !== "Escape"/);
  assert.doesNotMatch(
    behaviorSource,
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/,
  );
  assert.doesNotMatch(
    behaviorSource,
    /\b(?:localStorage|sessionStorage|indexedDB)\b|document\.cookie/,
  );
  assert.doesNotMatch(
    behaviorSource,
    /\b(?:innerHTML|outerHTML|insertAdjacentHTML)\b|\beval\s*\(|new\s+Function\b/,
  );
});
