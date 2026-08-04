/*
 * Arbitrary semantic hierarchy navigation for ptlam-visualization.
 *
 * Authoring contract:
 * - Root: data-ptv-semantic-zoom, optionally data-ptv-semantic-zoom-initial.
 * - Levels: data-ptv-semantic-zoom-level="unique-id", optional
 *   data-ptv-semantic-zoom-parent="parent-id", and an accessible label.
 * - Zoom in: native button[type="button"][data-ptv-semantic-zoom-in="child-id"]
 *   inside the child's direct parent level.
 * - Breadcrumbs: native
 *   button[type="button"][data-ptv-semantic-zoom-target="level-id"].
 * - Zoom out: native button[type="button"][data-ptv-semantic-zoom-out].
 * - Optional status: data-ptv-semantic-zoom-status.
 * - Optional localized status template on the root:
 *   data-ptv-semantic-zoom-status-template="Viewing {label}. Path: {path}.".
 *
 * Keep every level visible in source HTML. This controller hides inactive
 * levels only after validating the complete hierarchy, so no-JS reading and a
 * malformed enhancement both preserve all content.
 */

const initialized = new WeakSet();

const queryAll = (scope, selector) => {
  try {
    return Array.from(scope.querySelectorAll(selector));
  } catch {
    return [];
  }
};

const isButton = (element) => element?.tagName?.toLowerCase() === "button";

const isActionButton = (element) =>
  isButton(element) &&
  cleanId(element.getAttribute?.("type")).toLocaleLowerCase() === "button";

const belongsTo = (element, root) => {
  try {
    return element.closest("[data-ptv-semantic-zoom]") === root;
  } catch {
    return false;
  }
};

const listen = (target, type, listener) => {
  if (
    typeof target?.addEventListener !== "function" ||
    typeof target?.removeEventListener !== "function"
  ) {
    return null;
  }

  const safeListener = (event) => {
    try {
      listener(event);
    } catch {
      // One failed interaction must not make the remaining diagram unusable.
    }
  };
  target.addEventListener(type, safeListener);
  return () => target.removeEventListener(type, safeListener);
};

const cleanId = (value) => String(value ?? "").trim();

const setClass = (element, name, enabled) =>
  element?.classList?.toggle?.(name, Boolean(enabled));

const snapshotAttribute = (element, name) => ({
  present: element.hasAttribute(name),
  value: element.getAttribute(name),
});

const restoreAttribute = (element, name, snapshot) => {
  if (snapshot.present) element.setAttribute(name, snapshot.value ?? "");
  else element.removeAttribute?.(name);
};

const labelFor = (level, id) =>
  cleanId(level.getAttribute("data-ptv-semantic-zoom-label")) ||
  cleanId(level.getAttribute("aria-label")) ||
  id;

const makeModel = (root) => {
  const levelElements = queryAll(root, "[data-ptv-semantic-zoom-level]").filter(
    (level) => belongsTo(level, root),
  );
  if (levelElements.length === 0) return null;

  const levels = new Map();
  for (const element of levelElements) {
    const id = cleanId(element.getAttribute("data-ptv-semantic-zoom-level"));
    if (!id || levels.has(id)) return null;
    levels.set(id, {
      element,
      id,
      label: labelFor(element, id),
      parentId: cleanId(element.getAttribute("data-ptv-semantic-zoom-parent")),
    });
  }

  const roots = [...levels.values()].filter(({ parentId }) => !parentId);
  if (roots.length !== 1) return null;
  for (const level of levels.values()) {
    if (level.parentId && !levels.has(level.parentId)) return null;
  }

  const pathFor = (id) => {
    const path = [];
    const visited = new Set();
    let current = levels.get(id);
    while (current) {
      if (visited.has(current.id)) return null;
      visited.add(current.id);
      path.unshift(current);
      current = current.parentId ? levels.get(current.parentId) : null;
    }
    return path[0]?.id === roots[0].id ? path : null;
  };

  if ([...levels.keys()].some((id) => pathFor(id) === null)) return null;

  const initialId =
    cleanId(root.getAttribute("data-ptv-semantic-zoom-initial")) || roots[0].id;
  if (!levels.has(initialId)) return null;

  const zoomButtons = queryAll(
    root,
    "button[data-ptv-semantic-zoom-in]",
  ).filter((button) => belongsTo(button, root) && isActionButton(button));
  const zoomControls = zoomButtons
    .map((button) => {
      const targetId = cleanId(
        button.getAttribute("data-ptv-semantic-zoom-in"),
      );
      const sourceElement = button.closest?.("[data-ptv-semantic-zoom-level]");
      const sourceId = cleanId(
        sourceElement?.getAttribute?.("data-ptv-semantic-zoom-level"),
      );
      const target = levels.get(targetId);
      return target?.parentId === sourceId
        ? { button, sourceId, targetId }
        : null;
    })
    .filter(Boolean);
  const zoomTargetIds = new Set(zoomControls.map(({ targetId }) => targetId));
  if (
    [...levels.values()].some(
      ({ id }) => id !== roots[0].id && !zoomTargetIds.has(id),
    )
  ) {
    return null;
  }

  const crumbButtons = queryAll(
    root,
    "button[data-ptv-semantic-zoom-target]",
  ).filter((button) => belongsTo(button, root) && isActionButton(button));
  const crumbs = crumbButtons
    .map((button) => {
      const targetId = cleanId(
        button.getAttribute("data-ptv-semantic-zoom-target"),
      );
      return levels.has(targetId) ? { button, targetId } : null;
    })
    .filter(Boolean);
  const crumbIds = new Set(crumbs.map(({ targetId }) => targetId));
  if ([...levels.keys()].some((id) => !crumbIds.has(id))) return null;

  const outButton = queryAll(root, "button[data-ptv-semantic-zoom-out]").find(
    (button) => belongsTo(button, root) && isActionButton(button),
  );
  if (!outButton) return null;

  return {
    crumbs,
    initialId,
    levels,
    outButton,
    pathFor,
    rootId: roots[0].id,
    status: queryAll(root, "[data-ptv-semantic-zoom-status]").find((status) =>
      belongsTo(status, root),
    ),
    statusTemplate:
      root.getAttribute("data-ptv-semantic-zoom-status-template") ??
      "Viewing {label}. Path: {path}.",
    zoomControls,
  };
};

const isEditableTarget = (target) => {
  const tagName = target?.tagName?.toLowerCase();
  return (
    target?.isContentEditable === true ||
    tagName === "input" ||
    tagName === "select" ||
    tagName === "textarea"
  );
};

const setupSemanticZoom = (root) => {
  const model = makeModel(root);
  if (!model) return null;

  const originalRootCurrent = snapshotAttribute(
    root,
    "data-ptv-semantic-zoom-current",
  );
  const originalRootEnhanced = root.classList?.contains?.("ptv-is-enhanced");
  const originalLevels = new Map(
    [...model.levels.values()].map(({ element }) => [
      element,
      {
        ariaLabel: snapshotAttribute(element, "aria-label"),
        hidden: Boolean(element.hidden),
        tabIndex: element.tabIndex,
        tabIndexAttribute: snapshotAttribute(element, "tabindex"),
      },
    ]),
  );
  const originalCrumbs = new Map(
    model.crumbs.map(({ button }) => [
      button,
      {
        hidden: Boolean(button.hidden),
        current: snapshotAttribute(button, "aria-current"),
      },
    ]),
  );
  const originalOutDisabled = Boolean(model.outButton.disabled);
  const originalStatus = model.status?.textContent ?? "";
  const originalStatusAttributes = model.status
    ? {
        atomic: snapshotAttribute(model.status, "aria-atomic"),
        live: snapshotAttribute(model.status, "aria-live"),
        role: snapshotAttribute(model.status, "role"),
      }
    : null;
  const entryControl = new Map();
  const removers = [];
  let currentId = model.initialId;
  let transitionCounter = 0;

  setClass(root, "ptv-is-enhanced", true);

  const render = ({ direction = "none", focus = null } = {}) => {
    const path = model.pathFor(currentId);
    if (!path) return;
    const pathIds = new Set(path.map(({ id }) => id));
    const active = model.levels.get(currentId);

    root.setAttribute("data-ptv-semantic-zoom-current", currentId);
    for (const level of model.levels.values()) {
      const selected = level.id === currentId;
      level.element.hidden = !selected;
      setClass(level.element, "ptv-is-active", selected);
      setClass(level.element, "ptv-is-on-active-path", pathIds.has(level.id));
      setClass(level.element, "ptv-is-entering-from-parent", false);
      setClass(level.element, "ptv-is-entering-from-child", false);
      if (selected) {
        if (!level.element.hasAttribute("aria-label")) {
          level.element.setAttribute("aria-label", level.label);
        }
        level.element.tabIndex = -1;
        if (direction === "in") {
          setClass(level.element, "ptv-is-entering-from-parent", true);
        }
        if (direction === "out") {
          setClass(level.element, "ptv-is-entering-from-child", true);
        }
      }
    }

    for (const { button, targetId } of model.crumbs) {
      button.hidden = !pathIds.has(targetId);
      if (targetId === currentId) {
        button.setAttribute("aria-current", "location");
      } else {
        button.removeAttribute?.("aria-current");
      }
    }

    model.outButton.disabled = currentId === model.rootId;
    if (model.status) {
      model.status.setAttribute("role", "status");
      model.status.setAttribute("aria-live", "polite");
      model.status.setAttribute("aria-atomic", "true");
      model.status.textContent = String(model.statusTemplate)
        .replaceAll("{label}", active.label)
        .replaceAll("{path}", path.map(({ label }) => label).join(" › "));
    }

    transitionCounter += 1;
    const ownTransition = transitionCounter;
    if (direction !== "none") {
      const clearTransition = () => {
        if (transitionCounter !== ownTransition) return;
        setClass(active.element, "ptv-is-entering-from-parent", false);
        setClass(active.element, "ptv-is-entering-from-child", false);
      };
      let finished = false;
      let removeAnimationEnd;
      const finishTransition = () => {
        if (finished) return;
        finished = true;
        clearTransition();
        removeAnimationEnd?.();
      };
      removeAnimationEnd = listen(
        active.element,
        "animationend",
        finishTransition,
      );
      if (removeAnimationEnd) removers.push(() => removeAnimationEnd?.());
      const view = active.element.ownerDocument?.defaultView ?? globalThis;
      view.setTimeout?.(finishTransition, 500);
    }

    if (focus === "level") active.element.focus?.({ preventScroll: true });
    else focus?.focus?.({ preventScroll: true });
  };

  const navigate = (targetId, direction, focus) => {
    if (!model.levels.has(targetId) || targetId === currentId) return;
    currentId = targetId;
    render({ direction, focus });
  };

  for (const { button, sourceId, targetId } of model.zoomControls) {
    const removeClick = listen(button, "click", () => {
      if (currentId !== sourceId) return;
      entryControl.set(targetId, button);
      navigate(targetId, "in", "level");
    });
    if (removeClick) removers.push(removeClick);
  }

  for (const { button, targetId } of model.crumbs) {
    const removeClick = listen(button, "click", () => {
      const path = model.pathFor(currentId) ?? [];
      if (!path.some(({ id }) => id === targetId)) return;
      navigate(targetId, "out", button);
    });
    if (removeClick) removers.push(removeClick);
  }

  const zoomOut = () => {
    const current = model.levels.get(currentId);
    if (!current?.parentId) return;
    navigate(current.parentId, "out", entryControl.get(current.id) ?? "level");
  };
  const removeOut = listen(model.outButton, "click", zoomOut);
  if (removeOut) removers.push(removeOut);

  const removeKeydown = listen(root, "keydown", (event) => {
    if (event.key !== "Escape" || isEditableTarget(event.target)) return;
    const current = model.levels.get(currentId);
    if (!current?.parentId) return;
    event.preventDefault();
    zoomOut();
  });
  if (removeKeydown) removers.push(removeKeydown);

  render();

  return () => {
    transitionCounter += 1;
    removers.reverse().forEach((remove) => remove());
    setClass(root, "ptv-is-enhanced", originalRootEnhanced);
    restoreAttribute(
      root,
      "data-ptv-semantic-zoom-current",
      originalRootCurrent,
    );

    for (const [level, original] of originalLevels) {
      level.hidden = original.hidden;
      level.tabIndex = original.tabIndex;
      restoreAttribute(level, "aria-label", original.ariaLabel);
      restoreAttribute(level, "tabindex", original.tabIndexAttribute);
      setClass(level, "ptv-is-active", false);
      setClass(level, "ptv-is-on-active-path", false);
      setClass(level, "ptv-is-entering-from-parent", false);
      setClass(level, "ptv-is-entering-from-child", false);
    }
    for (const [button, original] of originalCrumbs) {
      button.hidden = original.hidden;
      restoreAttribute(button, "aria-current", original.current);
    }
    model.outButton.disabled = originalOutDisabled;
    if (model.status) {
      model.status.textContent = originalStatus;
      restoreAttribute(model.status, "role", originalStatusAttributes.role);
      restoreAttribute(
        model.status,
        "aria-live",
        originalStatusAttributes.live,
      );
      restoreAttribute(
        model.status,
        "aria-atomic",
        originalStatusAttributes.atomic,
      );
    }
  };
};

/**
 * Enhance each valid semantic-zoom root below `root`.
 *
 * Every hierarchy is isolated. Invalid roots remain untouched and readable.
 * The returned destroy method removes listeners and restores source visibility.
 */
export function initPtvSemanticZoom(root = globalThis.document) {
  if (!root || typeof root.querySelectorAll !== "function") {
    return Object.freeze({ destroy() {} });
  }

  const cleanups = [];
  for (const semanticZoom of queryAll(root, "[data-ptv-semantic-zoom]")) {
    if (initialized.has(semanticZoom)) continue;
    try {
      const cleanup = setupSemanticZoom(semanticZoom);
      if (!cleanup) continue;
      initialized.add(semanticZoom);
      cleanups.push(() => {
        try {
          cleanup();
        } finally {
          initialized.delete(semanticZoom);
        }
      });
    } catch {
      // Preserve the unenhanced hierarchy when its contract is malformed.
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
          // Teardown remains best-effort and isolated.
        }
      });
    },
  });
}

if (typeof document !== "undefined") {
  initPtvSemanticZoom(document);
}
