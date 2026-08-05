import type { CompilerPlugin } from "../../../../../tools/plugin-compiler/models/plugin.ts";
import type { PluginValidatorPort } from "../../../../../tools/plugin-compiler/plugin-validator.ts";
import { makeOutputPlugin } from "../test-fixtures/output-repository-fixture.ts";

export function createPluginValidatorFake(
  plugin: CompilerPlugin = makeOutputPlugin(),
): PluginValidatorPort & { calls: { rootDir?: string }[] } {
  const calls: { rootDir?: string }[] = [];

  return {
    calls,
    async validatePlugin(request) {
      calls.push(request);
      return { plugin, diagnostics: [] };
    },
  };
}
