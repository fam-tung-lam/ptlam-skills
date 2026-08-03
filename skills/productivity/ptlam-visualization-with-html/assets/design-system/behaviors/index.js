/*
 * Progressive exploration behaviors for ptlam-visualization-with-html.
 *
 * Public hooks:
 * - Tabs: data-ptv-tabs, data-ptv-tab-list, data-ptv-tab,
 *   data-ptv-tab-panel, and aria-controls.
 * - Coordinated disclosures: data-ptv-disclosures, optional data-ptv-single,
 *   and details[data-ptv-disclosure].
 * - Search/filter: data-ptv-filter, input[data-ptv-search],
 *   data-ptv-filter-item, data-ptv-filter-status, and optional
 *   data-ptv-filter-empty.
 * - Table sorting: table[data-ptv-sortable] and
 *   button[data-ptv-sort="text|number"].
 * - Highlighting: data-ptv-highlights, button[data-ptv-highlight], and
 *   data-ptv-highlight-target. Active targets receive .ptv-is-highlighted.
 * - Copy: button[data-ptv-copy] uses aria-controls for its text source and
 *   aria-describedby for a data-ptv-copy-status element.
 * - Theme: button[data-ptv-theme-toggle] toggles the document's
 *   data-ptv-theme value without persisting it.
 *
 * All controls are native buttons, inputs, or details elements. Authors keep
 * panels, filter items, copy sources, and conclusions readable in source HTML;
 * this module only adds optional exploration after the document has loaded.
 */

const initialized = {
  tabs: new WeakSet(),
  disclosures: new WeakSet(),
  filters: new WeakSet(),
  sortableTables: new WeakSet(),
  highlights: new WeakSet(),
  copy: new WeakSet(),
  theme: new WeakSet(),
};

const queryAll = (scope, selector) => {
  try {
    return Array.from(scope.querySelectorAll(selector));
  } catch {
    return [];
  }
};

const queryOne = (scope, selector) => {
  try {
    return scope.querySelector(selector);
  } catch {
    return null;
  }
};

const isElement = (element, tagName) =>
  element?.tagName?.toLowerCase() === tagName;

const belongsTo = (element, selector, owner) => {
  try {
    return element.closest(selector) === owner;
  } catch {
    return false;
  }
};

const documentFor = (element, root) =>
  element?.ownerDocument ??
  (root?.nodeType === 9 ? root : root?.ownerDocument) ??
  null;

const elementById = (element, root, id) => {
  if (!id) return null;
  const document = documentFor(element, root);
  return typeof document?.getElementById === "function"
    ? document.getElementById(id)
    : null;
};

const tokenList = (value) =>
  String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const guarded = (listener) => (event) => {
  try {
    return listener(event);
  } catch {
    return undefined;
  }
};

const listen = (target, type, listener) => {
  if (
    typeof target?.addEventListener !== "function" ||
    typeof target?.removeEventListener !== "function"
  ) {
    return null;
  }

  const safeListener = guarded(listener);
  target.addEventListener(type, safeListener);
  return () => target.removeEventListener(type, safeListener);
};

const register = (root, selector, seen, setup, cleanups) => {
  for (const element of queryAll(root, selector)) {
    if (seen.has(element)) continue;

    try {
      const cleanup = setup(element);
      if (typeof cleanup !== "function") continue;
      seen.add(element);
      cleanups.push(() => {
        try {
          cleanup();
        } finally {
          seen.delete(element);
        }
      });
    } catch {
      // One malformed enhancement must not prevent registration of any other.
    }
  }
};

const initTabs = (root, cleanups) => {
  register(
    root,
    "[data-ptv-tabs]",
    initialized.tabs,
    (group) => {
      const tabList = queryOne(group, "[data-ptv-tab-list]");
      if (!tabList || !belongsTo(tabList, "[data-ptv-tabs]", group)) {
        return null;
      }

      const tabs = queryAll(tabList, "button[data-ptv-tab]").filter((tab) =>
        belongsTo(tab, "[data-ptv-tabs]", group),
      );
      const pairs = tabs
        .map((tab) => {
          const panel = elementById(
            tab,
            root,
            tab.getAttribute("aria-controls"),
          );
          return panel?.matches?.("[data-ptv-tab-panel]")
            ? { tab, panel }
            : null;
        })
        .filter(Boolean);

      if (pairs.length === 0) return null;

      const activate = (selectedIndex, moveFocus = false) => {
        pairs.forEach(({ tab, panel }, index) => {
          const selected = index === selectedIndex;
          tab.setAttribute("aria-selected", String(selected));
          tab.tabIndex = selected ? 0 : -1;
          panel.hidden = !selected;
        });

        if (moveFocus) pairs[selectedIndex].tab.focus?.();
      };

      const selectedIndex = Math.max(
        0,
        pairs.findIndex(
          ({ tab }) => tab.getAttribute("aria-selected") === "true",
        ),
      );
      tabList.setAttribute("role", "tablist");
      pairs.forEach(({ tab, panel }) => {
        tab.setAttribute("role", "tab");
        panel.setAttribute("role", "tabpanel");
      });
      activate(selectedIndex);

      const removers = pairs.flatMap(({ tab }, index) => {
        const removeClick = listen(tab, "click", () => activate(index));
        const removeKeydown = listen(tab, "keydown", (event) => {
          const keyOffsets = {
            ArrowLeft: -1,
            ArrowUp: -1,
            ArrowRight: 1,
            ArrowDown: 1,
          };

          let nextIndex;
          if (event.key === "Home") nextIndex = 0;
          if (event.key === "End") nextIndex = pairs.length - 1;
          if (Object.hasOwn(keyOffsets, event.key)) {
            nextIndex =
              (index + keyOffsets[event.key] + pairs.length) % pairs.length;
          }
          if (nextIndex === undefined) return;

          event.preventDefault();
          activate(nextIndex, true);
        });
        return [removeClick, removeKeydown].filter(Boolean);
      });

      return () => removers.forEach((remove) => remove());
    },
    cleanups,
  );
};

const initDisclosures = (root, cleanups) => {
  register(
    root,
    "[data-ptv-disclosures]",
    initialized.disclosures,
    (group) => {
      const disclosures = queryAll(
        group,
        "details[data-ptv-disclosure]",
      ).filter(
        (details) =>
          isElement(details, "details") &&
          belongsTo(details, "[data-ptv-disclosures]", group) &&
          isElement(queryOne(details, "summary"), "summary"),
      );
      if (disclosures.length === 0) return null;

      const summaries = disclosures.map((details) =>
        queryOne(details, "summary"),
      );
      const sync = (details, summary) => {
        summary.setAttribute("aria-expanded", String(Boolean(details.open)));
      };
      disclosures.forEach((details, index) => sync(details, summaries[index]));

      const removers = disclosures
        .map((details, index) =>
          listen(details, "toggle", () => {
            sync(details, summaries[index]);
            if (!group.hasAttribute("data-ptv-single") || !details.open) {
              return;
            }

            disclosures.forEach((other, otherIndex) => {
              if (other === details || !other.open) return;
              other.open = false;
              sync(other, summaries[otherIndex]);
            });
          }),
        )
        .filter(Boolean);

      return () => removers.forEach((remove) => remove());
    },
    cleanups,
  );
};

const renderCount = (template, visible, total) =>
  String(template)
    .replaceAll("{visible}", String(visible))
    .replaceAll("{total}", String(total));

const initFilters = (root, cleanups) => {
  register(
    root,
    "[data-ptv-filter]",
    initialized.filters,
    (group) => {
      const input = queryOne(group, "input[data-ptv-search]");
      const status = queryOne(group, "[data-ptv-filter-status]");
      const items = queryAll(group, "[data-ptv-filter-item]").filter((item) =>
        belongsTo(item, "[data-ptv-filter]", group),
      );
      if (!isElement(input, "input") || !status || items.length === 0) {
        return null;
      }

      const empty = queryOne(group, "[data-ptv-filter-empty]");
      const originalHidden = new Map(
        items.map((item) => [item, Boolean(item.hidden)]),
      );
      const statusTemplate =
        group.getAttribute("data-ptv-filter-status-template") ??
        "Showing {visible} of {total}.";
      const emptyMessage =
        group.getAttribute("data-ptv-filter-empty-message") ??
        "No matching items.";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");

      const applyFilter = () => {
        const query = String(input.value ?? "")
          .trim()
          .toLocaleLowerCase();
        let visible = 0;

        items.forEach((item) => {
          const source =
            item.getAttribute("data-ptv-filter-text") ?? item.textContent ?? "";
          const matches = String(source).toLocaleLowerCase().includes(query);
          item.hidden = Boolean(originalHidden.get(item)) || !matches;
          if (!item.hidden) visible += 1;
        });

        status.textContent =
          visible === 0 && query
            ? emptyMessage
            : renderCount(statusTemplate, visible, items.length);
        if (empty) empty.hidden = visible !== 0 || query === "";
      };

      applyFilter();
      const removeInput = listen(input, "input", applyFilter);
      return () => removeInput?.();
    },
    cleanups,
  );
};

const sortableValue = (row, columnIndex, type) => {
  const cell = row.cells?.[columnIndex];
  const source =
    cell?.getAttribute?.("data-ptv-sort-value") ?? cell?.textContent ?? "";
  if (type === "number") {
    const number = Number(String(source).trim());
    return Number.isFinite(number) ? number : null;
  }
  return String(source).trim();
};

const compareValues = (left, right, type) => {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  if (type === "number") return left - right;
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

const initSortableTables = (root, cleanups) => {
  register(
    root,
    "table[data-ptv-sortable]",
    initialized.sortableTables,
    (table) => {
      if (!isElement(table, "table")) return null;
      const body = table.tBodies?.[0] ?? queryOne(table, "tbody");
      const buttons = queryAll(table, "button[data-ptv-sort]").filter(
        (button) => belongsTo(button, "table", table),
      );
      if (!body || buttons.length === 0) return null;

      const sortableHeaders = buttons
        .map((button) => {
          const header = button.closest("th");
          const columnIndex = Number(header?.cellIndex);
          if (!header || !Number.isInteger(columnIndex) || columnIndex < 0) {
            return null;
          }
          const requestedType = button.getAttribute("data-ptv-sort");
          return {
            button,
            header,
            columnIndex,
            type: requestedType === "number" ? "number" : "text",
          };
        })
        .filter(Boolean);
      if (sortableHeaders.length === 0) return null;

      sortableHeaders.forEach(({ header }) =>
        header.setAttribute("aria-sort", "none"),
      );
      const removers = sortableHeaders
        .map(({ button, header, columnIndex, type }) =>
          listen(button, "click", () => {
            const direction =
              header.getAttribute("aria-sort") === "ascending"
                ? "descending"
                : "ascending";
            sortableHeaders.forEach(({ header: otherHeader }) =>
              otherHeader.setAttribute("aria-sort", "none"),
            );
            header.setAttribute("aria-sort", direction);

            const rows = Array.from(body.rows ?? queryAll(body, "tr"));
            const sorted = rows
              .map((row, originalIndex) => ({
                row,
                originalIndex,
                value: sortableValue(row, columnIndex, type),
              }))
              .sort((left, right) => {
                const order = compareValues(left.value, right.value, type);
                return (
                  (direction === "ascending" ? order : -order) ||
                  left.originalIndex - right.originalIndex
                );
              })
              .map(({ row }) => row);
            body.append(...sorted);
          }),
        )
        .filter(Boolean);

      return () => removers.forEach((remove) => remove());
    },
    cleanups,
  );
};

const initHighlights = (root, cleanups) => {
  register(
    root,
    "[data-ptv-highlights]",
    initialized.highlights,
    (group) => {
      const buttons = queryAll(group, "button[data-ptv-highlight]").filter(
        (button) => belongsTo(button, "[data-ptv-highlights]", group),
      );
      const targets = queryAll(group, "[data-ptv-highlight-target]").filter(
        (target) => belongsTo(target, "[data-ptv-highlights]", group),
      );
      const controls = buttons
        .map((button) => ({
          button,
          key: button.getAttribute("data-ptv-highlight")?.trim(),
        }))
        .filter(({ key }) => Boolean(key));
      if (controls.length === 0 || targets.length === 0) return null;

      controls.forEach(({ button }) => {
        const pressed = button.getAttribute("aria-pressed") === "true";
        button.setAttribute("aria-pressed", String(pressed));
      });
      const syncTargets = () => {
        const activeKeys = new Set(
          controls
            .filter(
              ({ button }) => button.getAttribute("aria-pressed") === "true",
            )
            .map(({ key }) => key),
        );
        targets.forEach((target) => {
          const highlighted = tokenList(
            target.getAttribute("data-ptv-highlight-target"),
          ).some((key) => activeKeys.has(key));
          target.classList.toggle("ptv-is-highlighted", highlighted);
        });
      };
      syncTargets();

      const removers = controls
        .map(({ button }) =>
          listen(button, "click", () => {
            const pressed = button.getAttribute("aria-pressed") === "true";
            button.setAttribute("aria-pressed", String(!pressed));
            syncTargets();
          }),
        )
        .filter(Boolean);

      return () => removers.forEach((remove) => remove());
    },
    cleanups,
  );
};

const initCopyControls = (root, options, cleanups) => {
  register(
    root,
    "button[data-ptv-copy]",
    initialized.copy,
    (button) => {
      const source = elementById(
        button,
        root,
        button.getAttribute("aria-controls"),
      );
      const status = tokenList(button.getAttribute("aria-describedby"))
        .map((id) => elementById(button, root, id))
        .find((element) => element?.matches?.("[data-ptv-copy-status]"));
      if (!source || !status) return null;

      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      const document = documentFor(button, root);
      const clipboard =
        options.clipboard ?? document?.defaultView?.navigator?.clipboard;
      const removeClick = listen(button, "click", async () => {
        try {
          if (typeof clipboard?.writeText !== "function") {
            throw new Error("Clipboard unavailable");
          }
          await clipboard.writeText(source.textContent ?? "");
          status.textContent =
            button.getAttribute("data-ptv-copy-success-message") ?? "Copied.";
        } catch {
          status.textContent =
            button.getAttribute("data-ptv-copy-error-message") ??
            "Copy unavailable.";
        }
      });

      return () => removeClick?.();
    },
    cleanups,
  );
};

const resolvedTheme = (target, document) => {
  const explicit = target.getAttribute("data-ptv-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return document?.defaultView?.matchMedia?.("(prefers-color-scheme: dark)")
    ?.matches
    ? "dark"
    : "light";
};

const initThemeToggles = (root, cleanups) => {
  register(
    root,
    "button[data-ptv-theme-toggle]",
    initialized.theme,
    (button) => {
      const document = documentFor(button, root);
      const target = document?.documentElement;
      if (!target) return null;

      const syncButtons = () => {
        const dark = resolvedTheme(target, document) === "dark";
        queryAll(root, "button[data-ptv-theme-toggle]").forEach((control) =>
          control.setAttribute("aria-pressed", String(dark)),
        );
      };
      syncButtons();
      const removeClick = listen(button, "click", () => {
        const next =
          resolvedTheme(target, document) === "dark" ? "light" : "dark";
        target.setAttribute("data-ptv-theme", next);
        syncButtons();
      });

      return () => removeClick?.();
    },
    cleanups,
  );
};

/**
 * Enhance all recognized behavior roots below `root`.
 *
 * The optional clipboard adapter exists only so copy behavior can degrade and
 * be tested without reaching through the module seam. The returned destroy
 * method removes registered listeners; calling the initializer again is safe.
 */
export function initPtvBehaviors(
  root = globalThis.document,
  { clipboard } = {},
) {
  if (!root || typeof root.querySelectorAll !== "function") {
    return Object.freeze({ destroy() {} });
  }

  const cleanups = [];
  initTabs(root, cleanups);
  initDisclosures(root, cleanups);
  initFilters(root, cleanups);
  initSortableTables(root, cleanups);
  initHighlights(root, cleanups);
  initCopyControls(root, { clipboard }, cleanups);
  initThemeToggles(root, cleanups);

  let destroyed = false;
  return Object.freeze({
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cleanups.reverse().forEach((cleanup) => {
        try {
          cleanup();
        } catch {
          // Teardown remains best-effort and isolated too.
        }
      });
    },
  });
}

if (typeof document !== "undefined") {
  initPtvBehaviors(document);
}
