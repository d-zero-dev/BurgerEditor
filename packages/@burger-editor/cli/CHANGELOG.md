# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [4.0.0-alpha.72](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.71...v4.0.0-alpha.72) (2026-09-02)

### Bug Fixes

- **cli:** reject a NaN or non-integer block index instead of resolving to nothing ([f4a0a36](https://github.com/d-zero-dev/BurgerEditor/commit/f4a0a3667d21e29b9cdef39376eeb6adb107a37e))
- **cli:** reject traversing page paths at the schema edge and map the resolver error ([55a30d9](https://github.com/d-zero-dev/BurgerEditor/commit/55a30d9b95275956fd15c6c14c5030bb54c7685f))
- **cli:** report the real final index of a block moved past the end ([a7faa79](https://github.com/d-zero-dev/BurgerEditor/commit/a7faa79ea7da8603f4741a51b7f36c0b1f309048))
- **cli:** teach agents to recover from user-editing instead of failing ([1cff53d](https://github.com/d-zero-dev/BurgerEditor/commit/1cff53d04782123abbb1dfdb007cd2f0149f86c7))
- **cli:** tell the agent to read the catalog/item schema before composing a block spec ([0074bbd](https://github.com/d-zero-dev/BurgerEditor/commit/0074bbdd3328509bd235fa2f89c9d0b371ca45b5))

- feat(cli)!: add agent-tools framework for AI-agent page/block mutations ([b75ee87](https://github.com/d-zero-dev/BurgerEditor/commit/b75ee87798248a9683fbaba6a19ef844701dd3cb))

### BREAKING CHANGES

- v4 tool names, argument shapes, and response shapes
  changed (block_list removed, block_* targets are {index}|{id} instead
  of a bare index, mutations require readToken). No compatibility
  guaranteed pre-1.0; v3 compat tools are untouched.

# [4.0.0-alpha.71](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.70...v4.0.0-alpha.71) (2026-08-11)

### Bug Fixes

- **cli:** make itemSchema tolerant of empty or invalid data-bge bindings ([5cfb7be](https://github.com/d-zero-dev/BurgerEditor/commit/5cfb7be62a084f3c539c710db94cd1cd756508fe))

- feat(cli)!: itemSchema returns data fields instead of editor HTML ([3408626](https://github.com/d-zero-dev/BurgerEditor/commit/34086265ecdf7a28f97ead4fbf63a3f1f28e2754))

### BREAKING CHANGES

- the editor property is gone from the item-schema
  output (editor.html no longer exists). A fields array — the camelCased
  data keys parsed from the template's data-bge bindings — replaces it
  so agents can still infer the required keys.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

# [4.0.0-alpha.70](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.69...v4.0.0-alpha.70) (2026-06-12)

**Note:** Version bump only for package @burger-editor/cli

# [4.0.0-alpha.69](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.68...v4.0.0-alpha.69) (2026-06-12)

**Note:** Version bump only for package @burger-editor/cli

# [4.0.0-alpha.68](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.67...v4.0.0-alpha.68) (2026-06-12)

**Note:** Version bump only for package @burger-editor/cli

# [4.0.0-alpha.67](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.66...v4.0.0-alpha.67) (2026-06-11)

### Bug Fixes

- **cli:** atomic page-create, source existence check, scoped stdout redirect, plus tests + README ([a9e6769](https://github.com/d-zero-dev/BurgerEditor/commit/a9e6769c1b5d9d849d3fc6338435d5222007099e))

### Features

- **cli:** add agent-facing CLI with noun-verb subcommands ([3d8a52b](https://github.com/d-zero-dev/BurgerEditor/commit/3d8a52bffcdc41822d84e2f9df61d8abb17b9069))
