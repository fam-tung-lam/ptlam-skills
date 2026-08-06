---
schema_version: 1
skill: ptlam-testing
research_id: node-typescript-runtime
verified_at: 2026-08-06
---

# Native Node.js TypeScript runtime

Node.js added built-in TypeScript type stripping in 22.6. The visualization
skill's bundled tools therefore require Node.js 22.6 or newer and use only
erasable TypeScript syntax. They run with `node --experimental-strip-types`
without Python, a build step, or runtime npm dependencies.

Primary reference:

- [Node.js TypeScript type stripping](https://nodejs.org/api/typescript.html#type-stripping)
