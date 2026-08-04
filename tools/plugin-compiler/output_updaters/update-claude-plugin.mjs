function renderJson(value) {
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
export function updateClaudePlugin({ plugin }) {
  const { metadata, marketplace } = plugin;

  return {
    pluginJson: renderJson({
      name: metadata.name,
      version: metadata.version,
      description: metadata.description,
      author: metadata.author,
      homepage: metadata.homepage,
      repository: metadata.repository,
      license: metadata.license,
      keywords: metadata.keywords,
      skills: plugin.skills.map((skill) => `./${skill.path}`),
    }),
    marketplaceJson: renderJson({
      name: marketplace.name,
      owner: metadata.author,
      description: marketplace.description,
      plugins: [
        {
          name: metadata.name,
          source: "./",
          description: marketplace.plugin_description,
          category: marketplace.category,
          keywords: marketplace.keywords,
        },
      ],
    }),
  };
}
