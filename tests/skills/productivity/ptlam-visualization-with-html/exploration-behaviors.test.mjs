import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const behaviorUrl = new URL(
  "../../../../skills/productivity/ptlam-visualization-with-html/assets/design-system/behaviors/index.js",
  import.meta.url,
);
const source = await readFile(behaviorUrl, "utf8");
const behaviorModule = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

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
    this.open = false;
    this.tabIndex = 0;
    this.value = "";
    this.cellIndex = -1;
    this.cells = undefined;
    this.rows = undefined;
    this.tBodies = undefined;
    this.listeners = new Map();
  }

  appendChild(child) {
    this.append(child);
    return child;
  }

  append(...children) {
    for (const child of children) {
      if (child.parentElement) {
        child.parentElement.children = child.parentElement.children.filter(
          (candidate) => candidate !== child,
        );
      }
      child.parentElement = this;
      this.children.push(child);
      if (this.ownerDocument) assignDocument(child, this.ownerDocument);
    }
    if (this.tagName === "TBODY") this.rows = [...this.children];
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

  async emit(type, properties = {}) {
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
    for (const listener of this.listeners.get(type) ?? []) {
      await listener(event);
    }
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
  constructor({ prefersDark = false } = {}) {
    this.nodeType = 9;
    this.documentElement = new FakeElement("html");
    this.defaultView = {
      navigator: {},
      matchMedia: () => ({ matches: prefersDark }),
    };
    this.activeElement = null;
    assignDocument(this.documentElement, this);
  }

  getElementById(id) {
    if (this.documentElement.getAttribute("id") === id) {
      return this.documentElement;
    }
    return (
      this.documentElement
        .querySelectorAll("[id]")
        .find((element) => element.getAttribute("id") === id) ?? null
    );
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

function makeFixture() {
  const document = new FakeDocument({ prefersDark: true });
  const body = element("body");
  document.documentElement.append(body);

  const malformedTabs = element("section", { "data-ptv-tabs": "" });
  malformedTabs.querySelector = () => {
    throw new Error("Malformed optional tabs");
  };
  body.append(malformedTabs);

  const tabs = element("section", { "data-ptv-tabs": "" });
  const tabList = element("div", { "data-ptv-tab-list": "" });
  const firstTab = element(
    "button",
    {
      id: "overview-tab",
      "data-ptv-tab": "",
      "aria-controls": "overview-panel",
    },
    "Overview",
  );
  const secondTab = element(
    "button",
    {
      id: "evidence-tab",
      "data-ptv-tab": "",
      "aria-controls": "evidence-panel",
    },
    "Evidence",
  );
  const firstPanel = element(
    "section",
    { id: "overview-panel", "data-ptv-tab-panel": "" },
    "The conclusion remains in the document.",
  );
  const secondPanel = element(
    "section",
    { id: "evidence-panel", "data-ptv-tab-panel": "" },
    "Supporting evidence remains in the document too.",
  );
  tabList.append(firstTab, secondTab);
  tabs.append(tabList, firstPanel, secondPanel);
  body.append(tabs);

  const disclosures = element("section", {
    "data-ptv-disclosures": "",
    "data-ptv-single": "",
  });
  const firstDetails = element("details", { "data-ptv-disclosure": "" });
  const firstSummary = element("summary", {}, "First details");
  firstDetails.append(firstSummary, element("p", {}, "First answer"));
  const secondDetails = element("details", { "data-ptv-disclosure": "" });
  const secondSummary = element("summary", {}, "Second details");
  secondDetails.append(secondSummary, element("p", {}, "Second answer"));
  disclosures.append(firstDetails, secondDetails);
  body.append(disclosures);

  const filter = element("section", {
    "data-ptv-filter": "",
    "data-ptv-filter-status-template": "{visible}/{total} visible",
    "data-ptv-filter-empty-message": "<b>No match</b>",
  });
  const search = element("input", { type: "search", "data-ptv-search": "" });
  const filterStatus = element("p", { "data-ptv-filter-status": "" });
  const apple = element("article", { "data-ptv-filter-item": "" }, "Apple");
  const banana = element("article", { "data-ptv-filter-item": "" }, "Banana");
  const filterEmpty = element("p", { "data-ptv-filter-empty": "" }, "Empty");
  filter.append(search, filterStatus, apple, banana, filterEmpty);
  body.append(filter);

  const table = element("table", { "data-ptv-sortable": "" });
  const head = element("thead");
  const headRow = element("tr");
  const numberHeader = element("th");
  numberHeader.cellIndex = 0;
  const sortButton = element(
    "button",
    { "data-ptv-sort": "number" },
    "Sort score",
  );
  numberHeader.append(sortButton);
  headRow.append(numberHeader);
  head.append(headRow);
  const tableBody = element("tbody");
  tableBody.rows = [];
  const makeRow = (value) => {
    const row = element("tr");
    const cell = element("td", {}, String(value));
    row.cells = [cell];
    row.append(cell);
    return row;
  };
  const rowTen = makeRow(10);
  const rowTwo = makeRow(2);
  const rowOne = makeRow(1);
  tableBody.append(rowTen, rowTwo, rowOne);
  table.tBodies = [tableBody];
  table.append(head, tableBody);
  body.append(table);

  const highlights = element("section", { "data-ptv-highlights": "" });
  const highlightButton = element(
    "button",
    { "data-ptv-highlight": "risk" },
    "Highlight risks",
  );
  const highlightTarget = element(
    "p",
    { "data-ptv-highlight-target": "risk decision" },
    "Risk detail",
  );
  highlights.append(highlightButton, highlightTarget);
  body.append(highlights);

  const copySource = element("code", { id: "copy-source" }, "<safe & exact>");
  const copyStatus = element("span", {
    id: "copy-status",
    "data-ptv-copy-status": "",
  });
  const copyButton = element(
    "button",
    {
      "data-ptv-copy": "",
      "aria-controls": "copy-source",
      "aria-describedby": "copy-status",
      "data-ptv-copy-success-message": "Copied safely",
    },
    "Copy",
  );
  body.append(copySource, copyButton, copyStatus);

  const themeButton = element(
    "button",
    { "data-ptv-theme-toggle": "", "aria-label": "Toggle theme" },
    "Theme",
  );
  body.append(themeButton);

  return {
    document,
    firstTab,
    secondTab,
    firstPanel,
    secondPanel,
    firstDetails,
    secondDetails,
    firstSummary,
    secondSummary,
    search,
    filterStatus,
    apple,
    banana,
    filterEmpty,
    numberHeader,
    sortButton,
    tableBody,
    highlightButton,
    highlightTarget,
    copyButton,
    copyStatus,
    themeButton,
  };
}

test("one public initializer documents and registers every data hook", () => {
  assert.equal(typeof behaviorModule.initPtvBehaviors, "function");
  for (const hook of [
    "data-ptv-tabs",
    "data-ptv-disclosures",
    "data-ptv-filter",
    "data-ptv-sortable",
    "data-ptv-highlights",
    "data-ptv-copy",
    "data-ptv-theme-toggle",
  ]) {
    assert.match(source, new RegExp(hook));
  }

  const fixture = makeFixture();
  assert.equal(fixture.firstPanel.hidden, false);
  assert.equal(fixture.secondPanel.hidden, false);
  assert.equal(fixture.apple.hidden, false);
  assert.equal(fixture.banana.hidden, false);
  const writes = [];
  behaviorModule.initPtvBehaviors(fixture.document, {
    clipboard: { writeText: async (value) => writes.push(value) },
  });

  assert.equal(fixture.firstTab.getAttribute("role"), "tab");
  assert.equal(fixture.firstTab.getAttribute("aria-selected"), "true");
  assert.equal(fixture.secondPanel.hidden, true);
  assert.equal(fixture.firstSummary.getAttribute("aria-expanded"), "false");
  assert.equal(fixture.filterStatus.getAttribute("role"), "status");
  assert.equal(fixture.numberHeader.getAttribute("aria-sort"), "none");
  assert.equal(fixture.highlightButton.getAttribute("aria-pressed"), "false");
  assert.equal(fixture.copyStatus.getAttribute("aria-live"), "polite");
  assert.equal(fixture.themeButton.getAttribute("aria-pressed"), "true");
});

test("tabs and coordinated native disclosures keep keyboard and ARIA state", async () => {
  const fixture = makeFixture();
  behaviorModule.initPtvBehaviors(fixture.document);

  const keyEvent = await fixture.firstTab.emit("keydown", {
    key: "ArrowRight",
  });
  assert.equal(keyEvent.defaultPrevented, true);
  assert.equal(fixture.document.activeElement, fixture.secondTab);
  assert.equal(fixture.firstPanel.hidden, true);
  assert.equal(fixture.secondPanel.hidden, false);
  assert.equal(fixture.secondTab.getAttribute("aria-selected"), "true");

  fixture.firstDetails.open = true;
  await fixture.firstDetails.emit("toggle");
  fixture.secondDetails.open = true;
  await fixture.secondDetails.emit("toggle");
  assert.equal(fixture.firstDetails.open, false);
  assert.equal(fixture.firstSummary.getAttribute("aria-expanded"), "false");
  assert.equal(fixture.secondSummary.getAttribute("aria-expanded"), "true");
});

test("search filters text locally and reports results through safe text", async () => {
  const fixture = makeFixture();
  behaviorModule.initPtvBehaviors(fixture.document);

  fixture.search.value = "banana";
  await fixture.search.emit("input");
  assert.equal(fixture.apple.hidden, true);
  assert.equal(fixture.banana.hidden, false);
  assert.equal(fixture.filterStatus.textContent, "1/2 visible");
  assert.equal(fixture.filterEmpty.hidden, true);

  fixture.search.value = "missing";
  await fixture.search.emit("input");
  assert.equal(fixture.apple.hidden, true);
  assert.equal(fixture.banana.hidden, true);
  assert.equal(fixture.filterStatus.textContent, "<b>No match</b>");
  assert.equal(fixture.filterEmpty.hidden, false);
});

test("table sorting is stable and highlighting uses pressed state", async () => {
  const fixture = makeFixture();
  behaviorModule.initPtvBehaviors(fixture.document);

  await fixture.sortButton.emit("click");
  assert.equal(fixture.numberHeader.getAttribute("aria-sort"), "ascending");
  assert.deepEqual(
    fixture.tableBody.rows.map((row) => row.cells[0].textContent),
    ["1", "2", "10"],
  );
  await fixture.sortButton.emit("click");
  assert.equal(fixture.numberHeader.getAttribute("aria-sort"), "descending");
  assert.deepEqual(
    fixture.tableBody.rows.map((row) => row.cells[0].textContent),
    ["10", "2", "1"],
  );

  await fixture.highlightButton.emit("click");
  assert.equal(fixture.highlightButton.getAttribute("aria-pressed"), "true");
  assert.equal(
    fixture.highlightTarget.classList.contains("ptv-is-highlighted"),
    true,
  );
});

test("copy and theme controls use injected capability without persistence", async () => {
  const fixture = makeFixture();
  const writes = [];
  behaviorModule.initPtvBehaviors(fixture.document, {
    clipboard: { writeText: async (value) => writes.push(value) },
  });

  await fixture.copyButton.emit("click");
  assert.deepEqual(writes, ["<safe & exact>"]);
  assert.equal(fixture.copyStatus.textContent, "Copied safely");

  await fixture.themeButton.emit("click");
  assert.equal(
    fixture.document.documentElement.getAttribute("data-ptv-theme"),
    "light",
  );
  assert.equal(fixture.themeButton.getAttribute("aria-pressed"), "false");
});

test("malformed enhancements fail locally and destroy removes listeners", async () => {
  const fixture = makeFixture();
  const registration = behaviorModule.initPtvBehaviors(fixture.document);

  assert.equal(fixture.firstTab.getAttribute("aria-selected"), "true");
  registration.destroy();
  await fixture.highlightButton.emit("click");
  assert.equal(fixture.highlightButton.getAttribute("aria-pressed"), "false");

  const secondRegistration = behaviorModule.initPtvBehaviors(fixture.document);
  await fixture.highlightButton.emit("click");
  assert.equal(fixture.highlightButton.getAttribute("aria-pressed"), "true");
  secondRegistration.destroy();
});

test("source excludes forbidden capabilities and unsafe HTML paths", () => {
  assert.doesNotMatch(
    source,
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/,
  );
  assert.doesNotMatch(
    source,
    /\b(?:localStorage|sessionStorage|indexedDB)\b|document\.cookie/,
  );
  assert.doesNotMatch(source, /\beval\s*\(|new\s+Function\b/);
  assert.doesNotMatch(source, /\b(?:innerHTML|outerHTML|insertAdjacentHTML)\b/);
  assert.doesNotMatch(
    source,
    /createElement\s*\(\s*["']script["']|setAttribute\s*\(\s*["']on/i,
  );
  assert.doesNotMatch(source, /\b(?:window|globalThis)\.[A-Z]\w*\s*=/);
});
