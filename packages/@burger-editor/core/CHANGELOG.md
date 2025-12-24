# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [4.0.0-alpha.43](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.42...v4.0.0-alpha.43) (2025-12-24)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.42](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.41...v4.0.0-alpha.42) (2025-12-11)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.34](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.33...v4.0.0-alpha.34) (2025-12-01)

### Bug Fixes

- **core:** avoid ItemEditorDialog instantiation in render ([980df40](https://github.com/d-zero-dev/BurgerEditor/commit/980df40bcb556edc01ffde0123fa0e09f36a939e))

# [4.0.0-alpha.33](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.32...v4.0.0-alpha.33) (2025-12-01)

### Bug Fixes

- **core:** reuse ComponentObserver instance for performance ([cd97e46](https://github.com/d-zero-dev/BurgerEditor/commit/cd97e469a71b686b7215097c4b0b88a6ca593d37))

# [4.0.0-alpha.32](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.31...v4.0.0-alpha.32) (2025-12-01)

### Bug Fixes

- **core:** add instance ID to ComponentObserver events ([17741ac](https://github.com/d-zero-dev/BurgerEditor/commit/17741acaebc528bd33148e0d15613dd068a45b57))
- **core:** change cleanup hook to array in EditorDialog ([1d03c2c](https://github.com/d-zero-dev/BurgerEditor/commit/1d03c2c03f2e1af5fc0fb3c1ac151817927739b4))
- **core:** clear template when opening item editor dialog ([5b95967](https://github.com/d-zero-dev/BurgerEditor/commit/5b95967f85c2053319066221db46f64ae69b8f60))
- **core:** correct cancel check in EditorDialog open method ([c81122b](https://github.com/d-zero-dev/BurgerEditor/commit/c81122bf156f35a08e3f950310756c4d6356582e))
- **core:** correct elMap type definition in Item class ([a8fd468](https://github.com/d-zero-dev/BurgerEditor/commit/a8fd468abe88c9a806ef65c227674514b314d31b))
- **core:** correct onOpen callback return value logic ([1885853](https://github.com/d-zero-dev/BurgerEditor/commit/1885853fec25b6a765418420cfab101dcee55905))
- **core:** handle checkbox value in item editor dialog ([05c3275](https://github.com/d-zero-dev/BurgerEditor/commit/05c3275536c6463b97d75b4b593b0af2c64f2cd2))
- **core:** improve class list processing in block options ([156b730](https://github.com/d-zero-dev/BurgerEditor/commit/156b7307b00fb31ea49fc40337c2ba533f5713f3))
- **core:** replace return with continue in item editor dialog loop ([61b1724](https://github.com/d-zero-dev/BurgerEditor/commit/61b1724ad998ce6fbade0d7ff0e7cc5bd7ce596c))
- **core:** trim id value and return null when empty in block options ([a682bfb](https://github.com/d-zero-dev/BurgerEditor/commit/a682bfb194195dd3fbeee645f55bee894f94e47a))

### Features

- **blocks:** notify css-width update via componentObserver ([821dd13](https://github.com/d-zero-dev/BurgerEditor/commit/821dd13fb1129a717eba9e966ece1455b6dca660))

# [4.0.0-alpha.31](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.30...v4.0.0-alpha.31) (2025-11-26)

### Bug Fixes

- **core:** add support for output elements in ItemEditorDialog ([24f4b7b](https://github.com/d-zero-dev/BurgerEditor/commit/24f4b7bff72de7ceb9768e3cfd077e33191f90ea))

### Features

- **core:** add max method and improve onChange handler in ItemEditorDialog ([5a614ee](https://github.com/d-zero-dev/BurgerEditor/commit/5a614ee237bd913c4b70cd04c059e71c3607a693))

# [4.0.0-alpha.30](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.29...v4.0.0-alpha.30) (2025-11-13)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.29](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.28...v4.0.0-alpha.29) (2025-10-22)

### Features

- **core:** add XSS sanitization with opt-out support ([cfb41c3](https://github.com/d-zero-dev/BurgerEditor/commit/cfb41c35ee0b5682a5a13b4526f8ab2bd292162d))

# [4.0.0-alpha.28](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.27...v4.0.0-alpha.28) (2025-10-22)

### Features

- **core:** add unknown-content fallback for missing item seeds ([5987139](https://github.com/d-zero-dev/BurgerEditor/commit/5987139d314383f59b60d1d477ef0fcf1d91b7da))
- **core:** handle missing editor template gracefully for unknown-content items ([2c9d3dd](https://github.com/d-zero-dev/BurgerEditor/commit/2c9d3ddc30f46f5e4d56eb39a10838a1c7b11037))
- **core:** move createItem helper to core package ([633e2f1](https://github.com/d-zero-dev/BurgerEditor/commit/633e2f1d8502ddae79c823c410586ec9bd00e51a))

# [4.0.0-alpha.27](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.26...v4.0.0-alpha.27) (2025-10-08)

### Bug Fixes

- **core:** handle JSDOM CSSStyleDeclaration iteration ([2f1ccc6](https://github.com/d-zero-dev/BurgerEditor/commit/2f1ccc633ed03c2e6961aae9d6e5ebc8d60698a8))

# [4.0.0-alpha.26](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.25...v4.0.0-alpha.26) (2025-10-08)

### Bug Fixes

- **core:** apply frame semantics during block creation ([af29386](https://github.com/d-zero-dev/BurgerEditor/commit/af293868c49dc0a10986a0fa7c7cf2649e9e8a83))

### Features

- **core:** add render function for block rendering ([ae5b84b](https://github.com/d-zero-dev/BurgerEditor/commit/ae5b84b78e1f3b71ed067e7cc393df3cef76e7d2))

# [4.0.0-alpha.25](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.24...v4.0.0-alpha.25) (2025-09-19)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.24](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.23...v4.0.0-alpha.24) (2025-09-19)

### Bug Fixes

- **core:** remove unnecessary break statement in getStyleRules ([c3c4d92](https://github.com/d-zero-dev/BurgerEditor/commit/c3c4d92bb57e9ea1463739206ce0be15b822cd86))

# [4.0.0-alpha.23](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.22...v4.0.0-alpha.23) (2025-09-19)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.22](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.21...v4.0.0-alpha.22) (2025-09-19)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.21](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.20...v4.0.0-alpha.21) (2025-09-19)

### Features

- **blocks:** enhance button item editor with icon support ([b55ad84](https://github.com/d-zero-dev/BurgerEditor/commit/b55ad844591006f87f6c4ac622953e4c9cda701d))
- **core:** add HTML to block data parsing functionality ([d65be4e](https://github.com/d-zero-dev/BurgerEditor/commit/d65be4e204b31c19447fef586738a28d7ef431ad))
- **core:** add new block definition system ([cb3b56b](https://github.com/d-zero-dev/BurgerEditor/commit/cb3b56b3f6b4142cddb5c3018efd0a8c12f6013d))
- **core:** add plain structured block element creation ([113de51](https://github.com/d-zero-dev/BurgerEditor/commit/113de51e0ca9ed39ffcb68b1751174a5ce81cc44))
- **core:** add setOptions method to EditorDialog ([fd09e73](https://github.com/d-zero-dev/BurgerEditor/commit/fd09e73e0a81abe2a5aced4dee4c7e2e070fdfef))
- **core:** enhance Item class for new architecture ([d041d24](https://github.com/d-zero-dev/BurgerEditor/commit/d041d24cc9a5cbb1c465fc8440004ede9338e010))
- **core:** rewrite BurgerBlock for new architecture ([de5c416](https://github.com/d-zero-dev/BurgerEditor/commit/de5c4169c71573c49c8d3f1414a293d59d93d5a9))
- **core:** rewrite BurgerEditorEngine for new architecture ([392e5e8](https://github.com/d-zero-dev/BurgerEditor/commit/392e5e841e7db99b61388884a3ddf2292ee007d7))

# [4.0.0-alpha.20](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.19...v4.0.0-alpha.20) (2025-09-11)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.19](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.18...v4.0.0-alpha.19) (2025-09-11)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.18](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.17...v4.0.0-alpha.18) (2025-09-11)

### Bug Fixes

- **core:** improve custom property extraction from CSS rules ([17c3658](https://github.com/d-zero-dev/BurgerEditor/commit/17c36584ae954a0b463fff45fd92364a4890b753))

### Features

- **client,core:** add container type selection to block options ([2f766f6](https://github.com/d-zero-dev/BurgerEditor/commit/2f766f6038dfd431edc8aafc9fc6df95ed6bd302))
- **core:** add autoRepeat property to ContainerProps ([9d489df](https://github.com/d-zero-dev/BurgerEditor/commit/9d489dfef100779690f7c1f2533feb596e01bd8d))
- **core:** add changeFrameSemantics method to BurgerBlock ([3a8f4e4](https://github.com/d-zero-dev/BurgerEditor/commit/3a8f4e4d63c7b5416935b75328c2cbd16333eb02))
- **core:** add frameSemantics support to container properties ([50071d0](https://github.com/d-zero-dev/BurgerEditor/commit/50071d036f0de7bdeb4053312cb7cc71a3b42bfa))
- **core:** add SelectableValue type and experimental config support ([d017626](https://github.com/d-zero-dev/BurgerEditor/commit/d0176269050f23fb144d44cf9c740a862a85389b))
- **core:** implement autoRepeat parsing and serialization ([17c509d](https://github.com/d-zero-dev/BurgerEditor/commit/17c509d8d0e4d70bd0751c7607f54e4b7c50cd16))
- **core:** implement health monitoring system with offline detection ([feec3fc](https://github.com/d-zero-dev/BurgerEditor/commit/feec3fca1c7b6e4200ba8072ddbd1923e14abfcc))
- **core:** update BlockOptionsDialog for autoRepeat ([d807942](https://github.com/d-zero-dev/BurgerEditor/commit/d8079429ca7d9b6f1571563ec3cbbcceca248b9d))

# [4.0.0-alpha.17](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.16...v4.0.0-alpha.17) (2025-08-25)

### Bug Fixes

- **core:** resolve issue with initial property definitions in get-custom-properties ([3e3c3b8](https://github.com/d-zero-dev/BurgerEditor/commit/3e3c3b8e0bd632115de07ece713477b982cbf204))

### Features

- **core:** change scope selector for custom properties ([d53552c](https://github.com/d-zero-dev/BurgerEditor/commit/d53552c17420ea5d0e3d1fd395654a45afc9ba43))
- **core:** enhance custom property retrieval with nested scope support ([abcd22c](https://github.com/d-zero-dev/BurgerEditor/commit/abcd22cf1afeb0cf1d7fd6404d52ec5034613381))

# [4.0.0-alpha.16](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.15...v4.0.0-alpha.16) (2025-08-22)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.15](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.14...v4.0.0-alpha.15) (2025-08-22)

### Features

- **core, local:** add sampleFilePath support ([aff164b](https://github.com/d-zero-dev/BurgerEditor/commit/aff164bc2e05ea13b2195c53564f8142235a7b2a))
- **core:** add debug mode data logging ([5b8d826](https://github.com/d-zero-dev/BurgerEditor/commit/5b8d8265969aab6a75fa33b509bd42fb8cae7ecc))

# [4.0.0-alpha.14](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.13...v4.0.0-alpha.14) (2025-08-14)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.13](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.12...v4.0.0-alpha.13) (2025-08-13)

**Note:** Version bump only for package @burger-editor/core

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
