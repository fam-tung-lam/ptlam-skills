# Visualization script architecture

The public script paths are stable command interfaces. Their implementations
follow the same dependency direction for HTML and Mermaid:

```text
command -> use case -> contract/policy -> adapter
                         |
                         v
                      evidence
```

## Generic module patterns

### Thin command

A public `*.mjs` command parses arguments, calls one use case, prints evidence,
and selects an exit code. It does not contain document parsing, rendering
policy, or runtime verification.

Examples: `html/validate.mjs`, `mermaid/validate.mjs`, and `mermaid/render.mjs`.

### Use case as the public test seam

A use case accepts domain input and returns a result without printing or
exiting. Commands and tests cross the same small interface.

Examples: `validateHtmlDocument`, `validateMermaidFile`, and `renderOne`.

### Contract or policy module

A contract or policy module owns one cohesive set of decisions. It returns
values or adds typed findings; it does not parse CLI flags.

Examples: HTML document/resource contracts, Mermaid source validation, and
render output policy.

### Explicit adapter

Filesystem and subprocess behavior lives in a module named for the external
collaboration. This keeps deterministic policy separate from local I/O and makes
the process seam replaceable in tests.

Examples: `html/validation/resource-contract.mjs` and
`mermaid/validation/runtime-adapter.mjs`.

### Stable evidence

Errors, warnings, unverified checks, and deliverables cross module interfaces as
structured evidence. Internal functions may change without changing the command
output contract.

## Placement rules

- Keep stable public commands at their documented paths.
- Put implementation modules under a capability and feature folder such as
  `html/validation/` or `mermaid/rendering/`.
- Name a module for the decision it owns; avoid broad `utils` or `helpers`
  modules.
- Introduce shared production code only after at least two real callers need the
  same semantics. Similar-looking HTML and Mermaid rules stay separate when
  their contracts differ.
- Keep process fakes under the nearest shared test `test_doubles/` directory.
  Keep non-domain command/temp-directory plumbing under test `support/`.
- Test observable behavior at the public command or use-case seam. Do not assert
  private function names, call order, or source-code layout.

## Current structure

```text
scripts/
├── html/
│   ├── validate.mjs
│   └── validation/
│       ├── document-contract.mjs
│       ├── html-source.mjs
│       ├── report.mjs
│       ├── resource-contract.mjs
│       └── validate-document.mjs
└── mermaid/
    ├── render.mjs
    ├── validate.mjs
    ├── internal/
    │   └── command-error.mjs
    ├── rendering/
    │   ├── output-policy.mjs
    │   └── render-output.mjs
    └── validation/
        ├── runtime-adapter.mjs
        ├── source-contract.mjs
        └── validate-diagram.mjs
```
