import type { PluginModel } from "../models/plugin.ts";

function renderJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * Render Claude's two plugin artifacts from the validated domain model.
 * This updater is pure: it does not inspect or mutate the filesystem.
 *
 * @param {{ plugin: object }} request Render request.
 * @param {object} request.plugin Validated plugin model containing metadata, marketplace settings, and skills.
 * @returns {{ pluginJson: string, marketplaceJson: string }} Newline-terminated JSON for `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.
 * @throws {TypeError} If the plugin model is missing required nested values or contains values JSON cannot serialize.
 *
 * @example
 * const { pluginJson, marketplaceJson } = updateClaudePlugin({ plugin });
 */
export function updateClaudePlugin({ plugin }: { plugin: PluginModel }): {
  pluginJson: string;
  marketplaceJson: string;
} {
  const publicSkills = plugin.skills.filter(
    (skill) =>
      skill.visibility === "public" &&
      (skill.status === "active" || skill.status === "deprecated"),
  );

  return {
    pluginJson: renderJson({
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      homepage: plugin.homepage,
      repository: plugin.repository,
      license: plugin.license,
      keywords: plugin.keywords,
      skills: publicSkills.map((skill) => `./skills/${skill.id}`),
    }),
    marketplaceJson: renderJson({
      name: plugin.marketplace.name,
      owner: plugin.author,
      description: plugin.marketplace.description,
      plugins: [
        {
          name: plugin.name,
          source: "./",
          description: plugin.marketplace.plugin_description,
          category: plugin.marketplace.category,
          keywords: plugin.marketplace.keywords,
        },
      ],
    }),
  };
}
