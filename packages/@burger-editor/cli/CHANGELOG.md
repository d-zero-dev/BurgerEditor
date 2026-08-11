# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
