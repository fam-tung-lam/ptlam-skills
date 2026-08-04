import { makeOutputPlugin } from "../test-fixtures/output_repository_fixture.mjs";

export function createPluginValidatorFake(plugin = makeOutputPlugin()) {
  const calls = [];

  return {
    calls,
    async validatePlugin(request) {
      calls.push(request);
      return { plugin, diagnostics: [] };
    },
  };
}
