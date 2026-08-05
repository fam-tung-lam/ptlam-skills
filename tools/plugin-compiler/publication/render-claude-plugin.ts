import type { PluginSnapshot } from "../models/plugin.ts";
import { selectPublishedSkills } from "./select-published-skills.ts";

export interface ClaudePluginArtifacts {
  readonly pluginJson: string;
  readonly marketplaceJson: string;
}

function renderJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** Render Claude plugin metadata without reading or mutating the filesystem. */
export function renderClaudePluginArtifacts({
  plugin,
}: {
  readonly plugin: PluginSnapshot;
}): ClaudePluginArtifacts {
  const publicSkills = selectPublishedSkills(plugin.skills);

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
