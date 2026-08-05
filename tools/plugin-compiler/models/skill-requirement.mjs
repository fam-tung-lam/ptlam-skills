/**
 * Immutable compile-time edge between two authored skills.
 *
 * `reason` explains why the dependency exists. `instructions` tells the agent
 * how to apply the embedded skill. Both values are emitted verbatim by the
 * composer and therefore remain part of the validated source snapshot.
 */
export class SkillRequirement {
  /**
   * @param {{ skill_id: string, reason: string, instructions: string }} requirement
   *   Validated dependency-edge fields from `plugin/plugin.yml`.
   */
  constructor({ skill_id, reason, instructions }) {
    this.skill_id = skill_id;
    this.reason = reason;
    this.instructions = instructions;
    Object.freeze(this);
  }
}
