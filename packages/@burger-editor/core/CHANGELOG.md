# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [4.0.0-alpha.12](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.11...v4.0.0-alpha.12) (2025-08-08)

### Features

- **core:** change CSS custom property separator from single dash to double dash ([d023d3c](https://github.com/d-zero-dev/BurgerEditor/commit/d023d3cc16dc7f80d1e5ae8562f7f729d8814cc9))

### BREAKING CHANGES

- **core:** CSS custom property naming convention changed from

--bge-options-category-value to --bge-options-category--value

for better readability and parsing

# [4.0.0-alpha.11](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.10...v4.0.0-alpha.11) (2025-08-01)

### Features

- **custom-element:** add wrapper element support for wysiwyg editor ([33bc035](https://github.com/d-zero-dev/BurgerEditor/commit/33bc03545019a4a79b011933c3fb062481940d32))

# [4.0.0-alpha.10](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.9...v4.0.0-alpha.10) (2025-08-01)

### Bug Fixes

- **core:** resolve updateGridItems bug by correcting DOM element selection ([c6293ba](https://github.com/d-zero-dev/BurgerEditor/commit/c6293baac8512b93c356c8102391aa72b0e429b9))

### Features

- **core:** add async support to item editor open functionality ([62460a9](https://github.com/d-zero-dev/BurgerEditor/commit/62460a986685f132fd498de91847a199919b67e7))
- **core:** add auto-fit grid layout functionality ([09afd9f](https://github.com/d-zero-dev/BurgerEditor/commit/09afd9f8cdd548f00532b79776b104e2b6ddb1ce))
- **core:** add content stylesheet caching to ItemEditorDialog ([f2192bf](https://github.com/d-zero-dev/BurgerEditor/commit/f2192bf52efafba9068222654317cf24a4c9d777))
- **core:** add getCustomProperty function for single property retrieval ([3ac2a37](https://github.com/d-zero-dev/BurgerEditor/commit/3ac2a370e7bb98b6304a83ffa4d737681eb304d6))
- **core:** enhance editor dialog to support shadow DOM elements ([069d9c6](https://github.com/d-zero-dev/BurgerEditor/commit/069d9c65d39cbfa990e95c3a6f677f94a1d50801))
- **core:** integrate custom element initialization and dependency ([1e0fd02](https://github.com/d-zero-dev/BurgerEditor/commit/1e0fd026bc162e15a9d95ea857672e0200dc52ee))

# [4.0.0-alpha.9](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.8...v4.0.0-alpha.9) (2025-07-11)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.8](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.7...v4.0.0-alpha.8) (2025-07-11)

### Features

- **blocks:** migrate wysiwyg editor from trix to lexical ([9bf448b](https://github.com/d-zero-dev/BurgerEditor/commit/9bf448bd6e341db08d257fef8315f057699e5637))
- **core:** add CSS layer support for better style management ([8965e42](https://github.com/d-zero-dev/BurgerEditor/commit/8965e42156f1bcd153ebdb04026f5f135c650f7b))
- **core:** filter out null valued custom properties ([37db905](https://github.com/d-zero-dev/BurgerEditor/commit/37db905db3c453c8c59ad5ed5bb58d946c6547a5))

# [4.0.0-alpha.7](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.6...v4.0.0-alpha.7) (2025-07-03)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.6](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.5...v4.0.0-alpha.6) (2025-06-26)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.5](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.4...v4.0.0-alpha.5) (2025-06-26)

### Bug Fixes

- **core:** ensure values are set after service initialization in item editor ([ca39e68](https://github.com/d-zero-dev/BurgerEditor/commit/ca39e68ffa501d732ac26a390a8a5d831785763c))
- **core:** fix typo in filename from data-form-html to data-from-html ([126a831](https://github.com/d-zero-dev/BurgerEditor/commit/126a831bb48069bc8a473a97dc3742180f7fda53))
- **core:** improve type safety and encoding for item primitive data ([a645fbc](https://github.com/d-zero-dev/BurgerEditor/commit/a645fbc31d215fe1c9c8a395401c446374235d94))
- **core:** update jaco dependency from 4.0.0 to 5.0.0 and fix import path ([e80ea28](https://github.com/d-zero-dev/BurgerEditor/commit/e80ea2801dd43000b830ddb1d764e8ce2aefcebf))

### Features

- **core:** add primitive data encoding/decoding utils ([a22b33c](https://github.com/d-zero-dev/BurgerEditor/commit/a22b33c23795bcdd1d13626f1436a2d12fefb514))
- **mcp-server:** implement Model Context Protocol server ([3d25043](https://github.com/d-zero-dev/BurgerEditor/commit/3d25043c1d5b98d10585fb57582bb89a6fec5aa8))

# [4.0.0-alpha.4](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.3...v4.0.0-alpha.4) (2025-04-07)

### Features

- **core:** add `tabs` UI type ([8a81c4e](https://github.com/d-zero-dev/BurgerEditor/commit/8a81c4ea7842ae8360fc037d8eea34012ae7497f))
- **core:** item editor supports an array data ([a1e5598](https://github.com/d-zero-dev/BurgerEditor/commit/a1e559826ebddfcea06bd5c63f6303094d0fd471))

# [4.0.0-alpha.3](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.2...v4.0.0-alpha.3) (2025-04-03)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.2](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.1...v4.0.0-alpha.2) (2025-04-03)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.1](https://github.com/d-zero-dev/BurgerEditor/compare/v0.10.0...v4.0.0-alpha.1) (2025-04-03)

### Features

- **repo:** create v4 ([1efcf18](https://github.com/d-zero-dev/BurgerEditor/commit/1efcf18e2f59567a87c5589ae057195c31dbc0e8))

### BREAKING CHANGES

- **repo:** created v4
