import type { PluginCategory } from "../../../../../../tools/plugin-compiler/models/category.ts";
import {
  PluginSchemaVersion,
  type PluginSnapshot,
} from "../../../../../../tools/plugin-compiler/models/plugin.ts";
import {
  type SkillRequirement,
  type SkillSnapshot,
  SkillStatus,
  SkillVisibility,
} from "../../../../../../tools/plugin-compiler/models/skill.ts";

type Mutable<T> = { -readonly [Property in keyof T]: T[Property] };

interface UnsafeMutableSkillSnapshot
  extends Omit<Mutable<SkillSnapshot>, "required_skills" | "resources"> {
  required_skills: SkillRequirement[];
  resources: { path: string; content: Buffer }[];
}

export interface UnsafeMutablePluginSnapshot
  extends Omit<Mutable<PluginSnapshot>, "categories" | "skills"> {
  categories: Mutable<PluginCategory>[];
  skills: UnsafeMutableSkillSnapshot[];
}

/**
 * Build deliberately mutable validated-looking input for renderer defense tests.
 * It bypasses the real snapshot factories and must never be used as validation proof.
 */
export function makeUnsafeMutablePluginSnapshotFixture(): UnsafeMutablePluginSnapshot {
  return {
    schema_version: PluginSchemaVersion.V1,
    name: "fixture-skills",
    version: "1.2.3",
    description: "Fixture plugin description.",
    author: {
      name: "Fixture Owner",
      email: "owner@example.test",
      url: "https://example.test",
    },
    homepage: "https://example.test/readme",
    repository: "https://example.test/repository",
    license: "MIT",
    keywords: ["agent-skills", "fixtures"],
    marketplace: {
      name: "fixture",
      description: "Fixture marketplace.",
      plugin_description: "Installable fixture skills.",
      category: "development",
      keywords: ["agent-skills", "testing"],
    },
    categories: [
      {
        id: "engineering",
        name: "Engineering",
        description: "Engineering skills.",
      },
      {
        id: "productivity",
        name: "Productivity",
        description: "Productivity skills.",
      },
      { id: "empty", name: "Empty", description: "Reserved category." },
    ],
    skills: [
      {
        id: "review-code-change",
        category_id: "engineering",
        description: "Review changes safely.",
        visibility: SkillVisibility.Internal,
        status: SkillStatus.Active,
        required_skills: [],
        source_path: "plugin/skills/review-code-change",
        source_body: "# Review code change\n",
        resources: [],
      },
      {
        id: "plan-task",
        category_id: "productivity",
        description: "Plan work.",
        visibility: SkillVisibility.Public,
        status: SkillStatus.Draft,
        required_skills: [],
        source_path: "plugin/skills/plan-task",
        source_body: "# Plan task\n",
        resources: [],
      },
      {
        id: "visualize-html",
        category_id: "productivity",
        description: "Create a polished HTML artifact.",
        visibility: SkillVisibility.Public,
        status: SkillStatus.Active,
        required_skills: [
          {
            skill_id: "review-code-change",
            reason: "Provides review rules.",
            instructions: "Apply it before rendering.",
          },
        ],
        source_path: "plugin/skills/visualize-html",
        source_body: "# Visualize HTML\n",
        resources: [],
      },
      {
        id: "old-visualizer",
        category_id: "productivity",
        description: "Create legacy visual artifacts.",
        visibility: SkillVisibility.Public,
        status: SkillStatus.Deprecated,
        required_skills: [],
        source_path: "plugin/skills/old-visualizer",
        source_body: "# Old visualizer\n",
        resources: [],
        deprecation: {
          reason: "Superseded by visualize-html.",
          instructions: "Use the replacement for new work.",
          replacement_skill_id: "visualize-html",
        },
      },
    ],
  };
}
