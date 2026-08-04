/*
 * Geometry validation for ptlam-visualization edge-label slots.
 *
 * Layout remains author-owned and readable without JavaScript. This behavior
 * measures the rendered result, records pass/fail state, and rechecks after a
 * resize. It never moves a label or changes the modeled relationship.
 */

export const MIN_EDGE_LABEL_CLEARANCE_PX = 8;

const finite = (value) => Number.isFinite(Number(value));

export function normalizeRect(rect) {
  if (!rect) return null;
  const left = finite(rect.left) ? Number(rect.left) : Number(rect.x);
  const top = finite(rect.top) ? Number(rect.top) : Number(rect.y);
  const width = Number(rect.width);
  const height = Number(rect.height);
  if (![left, top, width, height].every(Number.isFinite)) return null;
  if (width < 0 || height < 0) return null;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

const safeClearance = (value) =>
  Math.max(
    MIN_EDGE_LABEL_CLEARANCE_PX,
    finite(value) ? Number(value) : MIN_EDGE_LABEL_CLEARANCE_PX,
  );

export function rectanglesHaveClearance(
  firstRect,
  secondRect,
  clearance = MIN_EDGE_LABEL_CLEARANCE_PX,
) {
  const first = normalizeRect(firstRect);
  const second = normalizeRect(secondRect);
  if (!first || !second) return false;
  const gap = safeClearance(clearance);
  return (
    first.right + gap <= second.left ||
    second.right + gap <= first.left ||
    first.bottom + gap <= second.top ||
    second.bottom + gap <= first.top
  );
}

export function rectangleIsContained(rect, containerRect) {
  const candidate = normalizeRect(rect);
  const container = normalizeRect(containerRect);
  if (!candidate || !container) return false;
  return (
    candidate.left >= container.left &&
    candidate.top >= container.top &&
    candidate.right <= container.right &&
    candidate.bottom <= container.bottom
  );
}

export function validateEdgeLabelGeometry({
  labelRect,
  obstacleRects,
  containerRect,
  clearance = MIN_EDGE_LABEL_CLEARANCE_PX,
}) {
  const obstacles = Array.from(obstacleRects ?? []);
  return {
    clearance: safeClearance(clearance),
    contained: rectangleIsContained(labelRect, containerRect),
    clearsObstacles: obstacles.every((obstacleRect) =>
      rectanglesHaveClearance(labelRect, obstacleRect, clearance),
    ),
  };
}

const queryAll = (scope, selector) => {
  try {
    return Array.from(scope.querySelectorAll(selector));
  } catch {
    return [];
  }
};

const box = (element) => {
  try {
    return normalizeRect(element.getBoundingClientRect());
  } catch {
    return null;
  }
};

const validateRoot = (root) => {
  const labels = queryAll(root, "[data-ptv-edge-label-slot]");
  const obstacles = queryAll(root, "[data-ptv-edge-obstacle]")
    .map(box)
    .filter(Boolean);
  const authoredContainer = queryAll(
    root,
    "[data-ptv-label-clearance-container]",
  )[0];
  const containerRect = box(authoredContainer ?? root);
  const requestedClearance = root.getAttribute?.("data-ptv-label-clearance-px");

  if (
    !containerRect ||
    containerRect.width === 0 ||
    containerRect.height === 0
  ) {
    root.setAttribute?.("data-ptv-label-clearance", "pending");
    labels.forEach((label) =>
      label.setAttribute?.("data-ptv-label-clearance", "pending"),
    );
    return { root, passed: null, results: [] };
  }

  const results = labels.map((label) => {
    const geometry = validateEdgeLabelGeometry({
      labelRect: box(label),
      obstacleRects: obstacles,
      containerRect,
      clearance: requestedClearance,
    });
    const passed = geometry.contained && geometry.clearsObstacles;
    label.setAttribute?.("data-ptv-label-clearance", passed ? "pass" : "fail");
    return { element: label, passed, ...geometry };
  });

  const passed = labels.length > 0 && results.every((result) => result.passed);
  root.setAttribute?.("data-ptv-label-clearance", passed ? "pass" : "fail");
  return { root, passed, results };
};

export function initPtvEdgeLabelClearance(
  root = globalThis.document,
  { ResizeObserver: ResizeObserverClass = globalThis.ResizeObserver } = {},
) {
  const clearanceRoots = queryAll(root, "[data-ptv-label-clearance-root]");
  const measure = () => clearanceRoots.map(validateRoot);
  let observer = null;

  if (typeof ResizeObserverClass === "function") {
    observer = new ResizeObserverClass(measure);
    clearanceRoots.forEach((clearanceRoot) => observer.observe(clearanceRoot));
  } else {
    globalThis.addEventListener?.("resize", measure);
  }
  root.addEventListener?.("animationend", measure, true);

  const results = measure();
  return {
    results,
    measure,
    destroy() {
      observer?.disconnect?.();
      if (!observer) globalThis.removeEventListener?.("resize", measure);
      root.removeEventListener?.("animationend", measure, true);
      clearanceRoots.forEach((clearanceRoot) =>
        clearanceRoot.removeAttribute?.("data-ptv-label-clearance"),
      );
      clearanceRoots
        .flatMap((clearanceRoot) =>
          queryAll(clearanceRoot, "[data-ptv-edge-label-slot]"),
        )
        .forEach((label) =>
          label.removeAttribute?.("data-ptv-label-clearance"),
        );
    },
  };
}

if (globalThis.document) {
  initPtvEdgeLabelClearance(globalThis.document);
}
