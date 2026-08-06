# Skill Frontmatter Specification

Use this reference only when the resolved target supports Claude-style inline
YAML frontmatter. It adapts the field set from the supplied Claude skill
reference. Host capabilities change; verify current host documentation before
using optional fields.

In repositories where a manifest or compiler owns metadata, edit that authored
source instead. For example, the `ptlam-skills` plugin compiler rejects
frontmatter in authored `plugin/skills/*/SKILL.md` and generates it from
`plugin/plugin.yml`.

## Contents

- [Invocation fields](#invocation-fields)
- [Argument and visibility fields](#argument-and-visibility-fields)
- [Tool and execution fields](#tool-and-execution-fields)
- [Lifecycle hooks](#lifecycle-hooks)
- [String substitutions](#string-substitutions)
- [Static checks](#static-checks)

## Invocation fields

### `name`

The skill identifier and, where supported, slash-command name.

Common constraints:

- maximum 64 characters;
- lowercase letters, digits, and hyphens;
- no XML tags; and
- directory name matches the skill name.

Prefer a short action-oriented name with a leading word users and agents already
associate with the capability.

### `description`

The model-facing context pointer for model-invoked skills and a human-facing
summary for user-invoked skills. Common constraints include a 1024-character
maximum and no XML tags.

For model invocation:

1. state the capability;
2. add one trigger for each distinct branch;
3. add a reach clause when another skill should invoke it; and
4. remove synonymous triggers and identity already clear from the body.

Use a negative boundary only when a material false invocation cannot be
prevented with a positive target.

### `disable-model-invocation`

When the target supports this Boolean and it is `true`, the skill is available
only through explicit user invocation. Use it when only the human should decide
to begin the workflow, especially for side-effecting task skills.

When omitted or `false`, the model may discover the skill from its description.
Confirm exact host behavior because some products expose discovery and menu
visibility through different fields.

## Argument and visibility fields

### `argument-hint`

Documents expected slash-command arguments:

```yaml
argument-hint: "[service-name] [environment]"
```

### `user-invocable`

Controls whether the skill appears for direct user invocation on hosts that
support it. It does not necessarily control model access. Verify the interaction
with `disable-model-invocation` before combining them.

## Tool and execution fields

### `allowed-tools`

Restricts or grants tools on hosts that support skill-scoped permissions.
Declare the smallest set required by the workflow and use the host's exact tool
identifier syntax.

```yaml
allowed-tools: Bash(uv run*), Read, Write
```

### `context`

Set `context: fork` only when the target can run the skill in isolated context
and the workflow benefits from hiding unrelated conversation or later steps.
Confirm what inputs and tools the fork receives.

### `agent`

Selects a supported subagent type when isolated execution requires one. Do not
invent an agent name; resolve it from the host.

### `model`

Overrides the executing model where supported. Use only when a verified model
choice materially affects cost, latency, or capability. Treat exact model IDs as
time-sensitive.

## Lifecycle hooks

The `hooks` block can attach host-supported commands to skill lifecycle events:

```yaml
hooks:
  PreToolUse:
    - matcher: Bash
      hooks:
        - command: "echo 'About to run bash'"
          type: command
  PostToolUse:
    - matcher: Write
      hooks:
        - command: "scripts/lint.sh $FILE_PATH"
          type: command
```

Hooks add hidden execution and maintenance cost. Include them only when the
target supports the event, the side effect is authorized, and inline workflow
steps cannot provide the same control more transparently.

## String substitutions

Claude-style hosts may replace these values at invocation time:

| Variable | Meaning |
| --- | --- |
| `$ARGUMENTS` | All supplied arguments |
| `$ARGUMENTS[N]` | One zero-based argument |
| `$N` | Short form for one positional argument where supported |
| `${CLAUDE_SESSION_ID}` | Current Claude session identifier |

Example:

```markdown
Inspect GitHub issue $ARGUMENTS[0] under the repository's contribution policy.
```

If the skill does not consume arguments, omit argument substitutions and hints.
Verify whether unreferenced arguments are appended automatically by the target.

## Static checks

Confirm that:

- the target actually accepts every included field;
- the name and directory satisfy the target constraints;
- model- versus user-invocation behavior matches the chosen policy;
- the description contains one trigger per distinct branch;
- optional tools, agents, models, hooks, and substitutions exist on the target;
- time-sensitive model or host behavior is labeled and verified; and
- a manifest or generator is not the real metadata owner.
