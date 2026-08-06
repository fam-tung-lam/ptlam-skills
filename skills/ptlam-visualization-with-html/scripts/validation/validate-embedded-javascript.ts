import vm from "node:vm";

/** Return stable syntax diagnostics for inline classic JavaScript blocks. */
export function validateEmbeddedJavaScript(
  scripts: readonly string[],
): readonly string[] {
  const errors: string[] = [];

  scripts.forEach((script, index) => {
    if (!script.trim()) return;
    try {
      new vm.Script(script, { filename: `inline-script-${index + 1}.js` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(
        `JavaScript block ${index + 1} does not parse: ${firstLine(message)}`,
      );
    }
  });

  return Object.freeze(errors);
}

function firstLine(message: string): string {
  return message.split(/\r?\n/, 1)[0]?.trim() || "unknown syntax error";
}
