# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [4.0.0-alpha.64](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.63...v4.0.0-alpha.64) (2026-03-30)

### Bug Fixes

- **client:** exclude VR test directory from build dts generation ([e006695](https://github.com/d-zero-dev/BurgerEditor/commit/e006695c6448091ceb0b9b6fa5e1d8992068d550))
- **client:** exclude VR test directory from svelte-check ([bc0b1b9](https://github.com/d-zero-dev/BurgerEditor/commit/bc0b1b9f6bbc265c21dfeace4352c8828ccd1c5b))
- **core:** fix ComponentObserver.off, EditorUI.visible, and onChange init ([0513e50](https://github.com/d-zero-dev/BurgerEditor/commit/0513e505603ed4a3f5837c8681e824105935ff00))

# [4.0.0-alpha.63](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.62...v4.0.0-alpha.63) (2026-03-10)

### Bug Fixes

- **core:** use cascade layer priority when merging nested default values in getCustomProperties ([3cb2133](https://github.com/d-zero-dev/BurgerEditor/commit/3cb2133579467d6a87f4829c29ad44a4e5253996))

# [4.0.0-alpha.62](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.61...v4.0.0-alpha.62) (2026-03-10)

### Bug Fixes

- **client:** resolve BlockMenu crash when engine.content is not yet initialized ([0a3957f](https://github.com/d-zero-dev/BurgerEditor/commit/0a3957f0bf91c73de46de2b90e262fa45ba41f20))
- **core:** exclude nested selectors from default value determination in getCustomProperties ([bbfa46a](https://github.com/d-zero-dev/BurgerEditor/commit/bbfa46acee859fcbca8e936ff55b92189ceff46d))
- **core:** fall back to nested defaults when no direct default exists ([8331a63](https://github.com/d-zero-dev/BurgerEditor/commit/8331a639f314c26bbd98df62421189d85dfece31))
- **repo:** resolve svelte parser warning for non-svelte imports in eslint ([98ee228](https://github.com/d-zero-dev/BurgerEditor/commit/98ee22809d24641cff71536ce45cc08876e39e7f))

### Features

- **client:** add EngineState bridge for ComponentObserver reactivity ([cfdf25f](https://github.com/d-zero-dev/BurgerEditor/commit/cfdf25fb8e606008ae0cbe13c08ed5e4670527a9))

# [4.0.0-alpha.61](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.60...v4.0.0-alpha.61) (2026-02-18)

### Bug Fixes

- **core:** migrate disable sentinel from null to empty value ([174edb1](https://github.com/d-zero-dev/BurgerEditor/commit/174edb1cce31d317f68d98d44102e0cce2b161c9))
- **core:** resolve CSS [@layer](https://github.com/layer) order globally across stylesheets ([b59b5a3](https://github.com/d-zero-dev/BurgerEditor/commit/b59b5a337265150a5c8a41ca7f4d226022fb84d1))

# [4.0.0-alpha.60](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.59...v4.0.0-alpha.60) (2026-02-16)

### Features

- **blocks:** add repeat-min-inline-size CSS presets for grid auto-fit/auto-fill ([4c5149d](https://github.com/d-zero-dev/BurgerEditor/commit/4c5149d2d98c2908e4425aae184601b2daf3799d))
- **client:** add repeat-min-inline-size preset selector to block options UI ([a60077a](https://github.com/d-zero-dev/BurgerEditor/commit/a60077a29d20bc8819559eca73b9686d114a1cf6))
- **core:** add repeat-min-inline-size preset support for grid auto-fit/auto-fill ([0cef027](https://github.com/d-zero-dev/BurgerEditor/commit/0cef027c42388f584a4ad30b3a14b2103c49a2d7))

# [4.0.0-alpha.59](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.58...v4.0.0-alpha.59) (2026-02-12)

### Features

- **core:** add CSSScopeRule traversal support in getStyleRules ([250426e](https://github.com/d-zero-dev/BurgerEditor/commit/250426e6bfeda6d45b116e378c2e0600fa8bd57a))
- **core:** support :scope selector inside [@scope](https://github.com/scope) with matching root ([05ba726](https://github.com/d-zero-dev/BurgerEditor/commit/05ba7260b1e68118ea80cb856a21e803587b9776))

# [4.0.0-alpha.58](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.57...v4.0.0-alpha.58) (2026-02-05)

### Bug Fixes

- **blocks:** replace unset with revert for image aspectRatio ([9a9c99e](https://github.com/d-zero-dev/BurgerEditor/commit/9a9c99eb230818797d79f2f495b22f146bf00b29))

# [4.0.0-alpha.57](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.56...v4.0.0-alpha.57) (2026-02-03)

### Bug Fixes

- **frozen-patty:** set value via attribute for custom elements so it is reflected ([33e6a83](https://github.com/d-zero-dev/BurgerEditor/commit/33e6a83b5feeb4375fd8f9ae5c1c5028a75bc12d))
- **local:** preserve order of imported blocks when inserting after container ([b1b5c3d](https://github.com/d-zero-dev/BurgerEditor/commit/b1b5c3d9c6118ff3c8e1d2b27c9a0e91a289ce11))

# [4.0.0-alpha.56](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.55...v4.0.0-alpha.56) (2026-01-23)

### Bug Fixes

- **custom-element:** insert text-only container before alert message ([14bf8c7](https://github.com/d-zero-dev/BurgerEditor/commit/14bf8c78b96f63014a367a1872384a10a0f62bc7))
- **custom-element:** sync UI state on dialog open and mode changes ([7f26621](https://github.com/d-zero-dev/BurgerEditor/commit/7f266217ca0fbf0de3ace7e3e73ee76d182a67e8))

### Features

- **client:** add container query support to fieldset elements ([acbe312](https://github.com/d-zero-dev/BurgerEditor/commit/acbe312865289e725e541698a452a9e7f73e9322))

# [4.0.0-alpha.55](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.54...v4.0.0-alpha.55) (2026-01-23)

### Bug Fixes

- **client:** adjust select element padding for experimental mode selector ([a86bf75](https://github.com/d-zero-dev/BurgerEditor/commit/a86bf75a7ca1d47ebc825b95e2c3cfa35d86bf04))
- **custom-element:** adapt structure change warning message based on experimental flag ([7740886](https://github.com/d-zero-dev/BurgerEditor/commit/7740886eb5fe3483debf050568a8043ffe05c1a8))

### Features

- **client:** pass experimental.itemOptions.wysiwyg.enableTextOnlyMode to custom element ([1101db6](https://github.com/d-zero-dev/BurgerEditor/commit/1101db656215c37e873b8af1e14140021d5a2451))
- **core:** add experimental.itemOptions.wysiwyg.enableTextOnlyMode config option ([6202eb1](https://github.com/d-zero-dev/BurgerEditor/commit/6202eb1e6cbdbc10e216a5e8c1739672ff377689))
- **custom-element:** add experimental.textOnlyMode option for conditional UI ([1f7fda8](https://github.com/d-zero-dev/BurgerEditor/commit/1f7fda80a5fd6adfac5122855e7e82f545486b54))
- **custom-element:** disable WYSIWYG buttons in HTML and text-only modes ([06714c9](https://github.com/d-zero-dev/BurgerEditor/commit/06714c9a88613d0f07f3340b86ed2de4e3f1f63e))

# [4.0.0-alpha.54](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.53...v4.0.0-alpha.54) (2026-01-22)

### Bug Fixes

- **core:** include generalCSS in WYSIWYG editor dialog stylesheet ([52f819e](https://github.com/d-zero-dev/BurgerEditor/commit/52f819e73bf194c66f46d44303d0ad2a737458d0))

### Features

- **blocks:** add paragraph alignment styles to general.css ([6f2a50e](https://github.com/d-zero-dev/BurgerEditor/commit/6f2a50ea8b4d6d728549bf28fdbdb89a738c0e87))
- **custom-element:** add subscript, superscript, and paragraph alignment ([4eb0ca6](https://github.com/d-zero-dev/BurgerEditor/commit/4eb0ca6d33fcbc18a3654afb8c4860764886d094))

# [4.0.0-alpha.53](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.52...v4.0.0-alpha.53) (2026-01-22)

### Features

- **client:** add paste functionality to block catalog dialog ([3512478](https://github.com/d-zero-dev/BurgerEditor/commit/35124780830703e462c203c6c401db492f46a1ae))

# [4.0.0-alpha.52](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.51...v4.0.0-alpha.52) (2026-01-21)

### Features

- **blocks:** add auto-fit to all grid layouts in default catalog ([f94204c](https://github.com/d-zero-dev/BurgerEditor/commit/f94204c86e560777a03401cd67914c7c65dba1a1))
- **local:** export getUserConfig and createHealthChecker for 3rd party use ([17a84e4](https://github.com/d-zero-dev/BurgerEditor/commit/17a84e4f93330ef175ef163fe10275a0d332dfcf))

# [4.0.0-alpha.51](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.50...v4.0.0-alpha.51) (2026-01-16)

### Features

- **client:** add linkarea checkbox to block options ([c6ee2ee](https://github.com/d-zero-dev/BurgerEditor/commit/c6ee2ee23bb7c81a6285c5ade863925038e437ee))
- **core:** add linkarea option to container props ([e283d89](https://github.com/d-zero-dev/BurgerEditor/commit/e283d892956057a3f17c60e0975875eff6fdc7d2))

# [4.0.0-alpha.50](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.49...v4.0.0-alpha.50) (2026-01-15)

### Features

- **local:** add programmatic file upload API ([ddaf8a0](https://github.com/d-zero-dev/BurgerEditor/commit/ddaf8a0013d83d7d736efe3d7a36d475b1d07f14))

# [4.0.0-alpha.49](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.48...v4.0.0-alpha.49) (2026-01-15)

### Features

- **core:** export exportStyleOptions function ([02ebc4c](https://github.com/d-zero-dev/BurgerEditor/commit/02ebc4c940382745be24c57e843778951da114cb))
- **inspector:** create new package for HTML inspection utilities ([fa418c8](https://github.com/d-zero-dev/BurgerEditor/commit/fa418c80f52148811fbb513875b4a3b3e3664058))
- **local:** add bge search command for CSS variable search ([9e4fd1a](https://github.com/d-zero-dev/BurgerEditor/commit/9e4fd1a748f24423943bdcefaf3a9a36d2896550))
- **runtime:** create new package for browser runtime functionality ([00446ea](https://github.com/d-zero-dev/BurgerEditor/commit/00446ea41fc8ee2c579e761526fc222de7a3d307))

# [4.0.0-alpha.48](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.47...v4.0.0-alpha.48) (2026-01-08)

### Bug Fixes

- **client:** fix style extension select showing wrong value when before default ([700eae2](https://github.com/d-zero-dev/BurgerEditor/commit/700eae280d1709c005368c3b67376dae96c83993))

# [4.0.0-alpha.47](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.46...v4.0.0-alpha.47) (2026-01-06)

### Features

- **local:** add Front Matter editor above BurgerEditor ([08a6f32](https://github.com/d-zero-dev/BurgerEditor/commit/08a6f328d26c88d9dff7aa529ec5e51ff8e7f161))

# [4.0.0-alpha.46](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.45...v4.0.0-alpha.46) (2026-01-06)

### Bug Fixes

- **local:** normalize path ending with / to /index.html in content save endpoint ([db99886](https://github.com/d-zero-dev/BurgerEditor/commit/db998860e1fc945ad4bf54a942f7ae40c4b3557d))

### Features

- **local:** make indexFileName configurable ([bd9cda5](https://github.com/d-zero-dev/BurgerEditor/commit/bd9cda59a1ae3d8080eed132de3b166bc0a29686))

# [4.0.0-alpha.45](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.44...v4.0.0-alpha.45) (2025-12-26)

### Features

- **core:** add comparePriority utility function ([35f5689](https://github.com/d-zero-dev/BurgerEditor/commit/35f5689b1605433d4bfd3ef788ff06f169eb4576))
- **core:** add id parameter to stylesheet management ([678b012](https://github.com/d-zero-dev/BurgerEditor/commit/678b0121414bbd717a5edef13aa7e0252573d303))
- **core:** support CSS layer priority in custom property resolution ([69eb47c](https://github.com/d-zero-dev/BurgerEditor/commit/69eb47cd815edeb7f6a8b0425888c43f24614abb))

# [4.0.0-alpha.44](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.43...v4.0.0-alpha.44) (2025-12-25)

### Bug Fixes

- **blocks:** correct initial button kind data ([cb23669](https://github.com/d-zero-dev/BurgerEditor/commit/cb236696a94f705992ce6b6633ad366d8b0bf829))
- **core:** apply item initial values from catalog options ([f54500d](https://github.com/d-zero-dev/BurgerEditor/commit/f54500dcb166dde8e230615a271001ae5c20121f))

# [4.0.0-alpha.43](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.42...v4.0.0-alpha.43) (2025-12-24)

### Bug Fixes

- **mcp-server:** fix vitest import path ([bfae4a5](https://github.com/d-zero-dev/BurgerEditor/commit/bfae4a5118c6409d42b065b3fe54a6ba171d93d0))

# [4.0.0-alpha.42](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.41...v4.0.0-alpha.42) (2025-12-11)

### Features

- **custom-element:** add mode switch lock on structure change ([641d2a8](https://github.com/d-zero-dev/BurgerEditor/commit/641d2a80d320691f9ea47f16af0981d567793a3a))
- **frozen-patty:** add normalizeIndent function ([81fcc86](https://github.com/d-zero-dev/BurgerEditor/commit/81fcc861699bddc96694f9df8a884c0b477718b2))
- **utils:** add normalizeHtmlStructure function ([ca1ad19](https://github.com/d-zero-dev/BurgerEditor/commit/ca1ad19c1a54ddcb5db4f63e852984f16030c7db))

# [4.0.0-alpha.34](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.33...v4.0.0-alpha.34) (2025-12-01)

### Bug Fixes

- **core:** avoid ItemEditorDialog instantiation in render ([980df40](https://github.com/d-zero-dev/BurgerEditor/commit/980df40bcb556edc01ffde0123fa0e09f36a939e))

# [4.0.0-alpha.33](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.32...v4.0.0-alpha.33) (2025-12-01)

### Bug Fixes

- **core:** reuse ComponentObserver instance for performance ([cd97e46](https://github.com/d-zero-dev/BurgerEditor/commit/cd97e469a71b686b7215097c4b0b88a6ca593d37))

# [4.0.0-alpha.32](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.31...v4.0.0-alpha.32) (2025-12-01)

### Bug Fixes

- **blocks:** add null safety checks in image item beforeOpen ([0c2a193](https://github.com/d-zero-dev/BurgerEditor/commit/0c2a193c3f395ac00f2345011af17cec3fc61e91))
- **blocks:** initialize width state maxNumber and CSS width ([36b28b5](https://github.com/d-zero-dev/BurgerEditor/commit/36b28b5c230119fe808592392cce439cf91f9dfb))
- **client:** set width for number input in label-output span ([0a6e626](https://github.com/d-zero-dev/BurgerEditor/commit/0a6e626534161287fe48b566070a94abf0d23c5c))
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
- **frozen-patty:** apply type conversion for custom attr name shorthand notation ([48de87c](https://github.com/d-zero-dev/BurgerEditor/commit/48de87cc5d2b0e8f1e5b41c7decc88fde493b41d))

### Features

- **blocks:** add css property to width state debug output ([be74a64](https://github.com/d-zero-dev/BurgerEditor/commit/be74a647572e5c19a8b5bf5c52bdf59a8f899305))
- **blocks:** add debug flag to control console error output ([d60b505](https://github.com/d-zero-dev/BurgerEditor/commit/d60b505f3f41a641ae25155148c7963274bd7343))
- **blocks:** disable size fieldset during image loading ([75b5730](https://github.com/d-zero-dev/BurgerEditor/commit/75b57305ad98f0797c2b4901a5a2c286f75c6a85))
- **blocks:** notify css-width update via componentObserver ([821dd13](https://github.com/d-zero-dev/BurgerEditor/commit/821dd13fb1129a717eba9e966ece1455b6dca660))

# [4.0.0-alpha.31](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.30...v4.0.0-alpha.31) (2025-11-26)

### Bug Fixes

- **blocks:** correct relative paths in README links ([71096da](https://github.com/d-zero-dev/BurgerEditor/commit/71096dae67cfe8e83bd40d7fde5ae33413b1bf30))
- **core:** add support for output elements in ItemEditorDialog ([24f4b7b](https://github.com/d-zero-dev/BurgerEditor/commit/24f4b7bff72de7ceb9768e3cfd077e33191f90ea))

### Features

- **core:** add max method and improve onChange handler in ItemEditorDialog ([5a614ee](https://github.com/d-zero-dev/BurgerEditor/commit/5a614ee237bd913c4b70cd04c059e71c3607a693))

# [4.0.0-alpha.30](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.29...v4.0.0-alpha.30) (2025-11-13)

### Bug Fixes

- **blocks:** set image margin-inline to auto ([180dfb2](https://github.com/d-zero-dev/BurgerEditor/commit/180dfb2f3043912fb2e7591c4ac3a0e65cad1018))
- **local:** ensure directory exists before saving file ([0b4c6e4](https://github.com/d-zero-dev/BurgerEditor/commit/0b4c6e4880d17ddeedfc0d87229ee9aca0ffbcc6))

# [4.0.0-alpha.29](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.28...v4.0.0-alpha.29) (2025-10-22)

### Features

- **core:** add XSS sanitization with opt-out support ([cfb41c3](https://github.com/d-zero-dev/BurgerEditor/commit/cfb41c35ee0b5682a5a13b4526f8ab2bd292162d))

# [4.0.0-alpha.28](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.27...v4.0.0-alpha.28) (2025-10-22)

### Features

- **blocks:** add import item for HTML file import ([c7684ed](https://github.com/d-zero-dev/BurgerEditor/commit/c7684eda4426253d4de645ebf10399d33160e5ba))
- **core:** add unknown-content fallback for missing item seeds ([5987139](https://github.com/d-zero-dev/BurgerEditor/commit/5987139d314383f59b60d1d477ef0fcf1d91b7da))
- **core:** handle missing editor template gracefully for unknown-content items ([2c9d3dd](https://github.com/d-zero-dev/BurgerEditor/commit/2c9d3ddc30f46f5e4d56eb39a10838a1c7b11037))
- **core:** move createItem helper to core package ([633e2f1](https://github.com/d-zero-dev/BurgerEditor/commit/633e2f1d8502ddae79c823c410586ec9bd00e51a))
- **local:** add block import functionality ([e4d8aac](https://github.com/d-zero-dev/BurgerEditor/commit/e4d8aac5e1bd47549de6fe2bd36d777edcabacb2))
- **local:** add enableImportBlock configuration option ([3007e5d](https://github.com/d-zero-dev/BurgerEditor/commit/3007e5d3b046b9797f8a34b5b9236f7133e559e5))

# [4.0.0-alpha.27](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.26...v4.0.0-alpha.27) (2025-10-08)

### Bug Fixes

- **core:** handle JSDOM CSSStyleDeclaration iteration ([2f1ccc6](https://github.com/d-zero-dev/BurgerEditor/commit/2f1ccc633ed03c2e6961aae9d6e5ebc8d60698a8))

# [4.0.0-alpha.26](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.25...v4.0.0-alpha.26) (2025-10-08)

### Bug Fixes

- **core:** apply frame semantics during block creation ([af29386](https://github.com/d-zero-dev/BurgerEditor/commit/af293868c49dc0a10986a0fa7c7cf2649e9e8a83))

### Features

- **core:** add render function for block rendering ([ae5b84b](https://github.com/d-zero-dev/BurgerEditor/commit/ae5b84b78e1f3b71ed067e7cc393df3cef76e7d2))

# [4.0.0-alpha.25](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.24...v4.0.0-alpha.25) (2025-09-19)

### Bug Fixes

- **blocks:** remove unnecessary border property from options container ([1bc5c3e](https://github.com/d-zero-dev/BurgerEditor/commit/1bc5c3e71dad05fd5911d078d9c3aeafa1c0f988))

# [4.0.0-alpha.24](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.23...v4.0.0-alpha.24) (2025-09-19)

### Bug Fixes

- **core:** remove unnecessary break statement in getStyleRules ([c3c4d92](https://github.com/d-zero-dev/BurgerEditor/commit/c3c4d92bb57e9ea1463739206ce0be15b822cd86))

# [4.0.0-alpha.23](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.22...v4.0.0-alpha.23) (2025-09-19)

### Bug Fixes

- **local:** move @burger-editor/blocks from devDependencies to dependencies ([2be62e3](https://github.com/d-zero-dev/BurgerEditor/commit/2be62e300381bb7a9b744527e52dff195d8802cf))

# [4.0.0-alpha.22](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.21...v4.0.0-alpha.22) (2025-09-19)

**Note:** Version bump only for package BurgerEditor_v4

# [4.0.0-alpha.21](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.20...v4.0.0-alpha.21) (2025-09-19)

### Bug Fixes

- **client:** pass engine parameter to updateGridItems ([f821e3c](https://github.com/d-zero-dev/BurgerEditor/commit/f821e3ccf4ff5abd960d5f8ff009cf90ebf5a941))
- **client:** preserve element styles during replace animation ([c489d73](https://github.com/d-zero-dev/BurgerEditor/commit/c489d731ec3f0f0105df004df2f0e3631b5a4569))

### Features

- **blocks:** enhance button item editor with icon support ([b55ad84](https://github.com/d-zero-dev/BurgerEditor/commit/b55ad844591006f87f6c4ac622953e4c9cda701d))
- **blocks:** implement new data-driven block catalog system ([6bd0b0e](https://github.com/d-zero-dev/BurgerEditor/commit/6bd0b0e8098f28c7f40eaebd6097ca86b5377b89))
- **core:** add HTML to block data parsing functionality ([d65be4e](https://github.com/d-zero-dev/BurgerEditor/commit/d65be4e204b31c19447fef586738a28d7ef431ad))
- **core:** add new block definition system ([cb3b56b](https://github.com/d-zero-dev/BurgerEditor/commit/cb3b56b3f6b4142cddb5c3018efd0a8c12f6013d))
- **core:** add plain structured block element creation ([113de51](https://github.com/d-zero-dev/BurgerEditor/commit/113de51e0ca9ed39ffcb68b1751174a5ce81cc44))
- **core:** add setOptions method to EditorDialog ([fd09e73](https://github.com/d-zero-dev/BurgerEditor/commit/fd09e73e0a81abe2a5aced4dee4c7e2e070fdfef))
- **core:** enhance Item class for new architecture ([d041d24](https://github.com/d-zero-dev/BurgerEditor/commit/d041d24cc9a5cbb1c465fc8440004ede9338e010))
- **core:** rewrite BurgerBlock for new architecture ([de5c416](https://github.com/d-zero-dev/BurgerEditor/commit/de5c4169c71573c49c8d3f1414a293d59d93d5a9))
- **core:** rewrite BurgerEditorEngine for new architecture ([392e5e8](https://github.com/d-zero-dev/BurgerEditor/commit/392e5e841e7db99b61388884a3ddf2292ee007d7))
- **local:** add custom catalog test configuration ([3af60fc](https://github.com/d-zero-dev/BurgerEditor/commit/3af60fc98347f6737e90daee5c5dfe19ad329aa3))

# [4.0.0-alpha.20](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.19...v4.0.0-alpha.20) (2025-09-11)

### Bug Fixes

- **blocks:** improve immutable container flex layout structure ([8f732b7](https://github.com/d-zero-dev/BurgerEditor/commit/8f732b7e10b685918ebd9c92f111769e2ef12f52))
- **repo:** add npmClient yarn to lerna.json to include yarn.lock in publish commits ([f2d8ce0](https://github.com/d-zero-dev/BurgerEditor/commit/f2d8ce098da93ce8f7fc4ea8bba60e7f98785455))

# [4.0.0-alpha.19](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.18...v4.0.0-alpha.19) (2025-09-11)

### Bug Fixes

- **blocks:** resolve inline 2 columns sizing issues ([737155e](https://github.com/d-zero-dev/BurgerEditor/commit/737155ee9ffa5b88635c83cd331276a994dca372))
- **blocks:** wrap content-navigation items with data-bge-group ([9389172](https://github.com/d-zero-dev/BurgerEditor/commit/9389172f24d1b21747ca0f2725b488ecf7f8c425))

# [4.0.0-alpha.18](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.17...v4.0.0-alpha.18) (2025-09-11)

### Bug Fixes

- **blocks:** improve item layout with flexbox alignment and stretching ([64185c9](https://github.com/d-zero-dev/BurgerEditor/commit/64185c9296983ec916ffc185aa8b3d34f9b43176))
- **client:** exclude float container type from semantic frame selection ([11f3eee](https://github.com/d-zero-dev/BurgerEditor/commit/11f3eee5ebeda27d02f376b377e8111428368c2b))
- **core:** improve custom property extraction from CSS rules ([17c3658](https://github.com/d-zero-dev/BurgerEditor/commit/17c36584ae954a0b463fff45fd92364a4890b753))
- **custom-element:** use exact versions for TipTap packages ([ee95203](https://github.com/d-zero-dev/BurgerEditor/commit/ee952030a10823ede36eb84ca4da01032283c788))
- **frozen-patty:** handle string boolean values in checkbox setContent ([2e8f532](https://github.com/d-zero-dev/BurgerEditor/commit/2e8f532c8e67923e55f333a9c65b4505df0ed149))

### Features

- **blocks:** add content-navigation block with grid:4 layout and 8 in-page buttons ([3435d76](https://github.com/d-zero-dev/BurgerEditor/commit/3435d76888ca2d99850e1c575a98ed8acb4c2d36))
- **blocks:** add CSS support for auto-fill grid layout ([daa51a2](https://github.com/d-zero-dev/BurgerEditor/commit/daa51a27ac2db945a8a61daeb94be99e20504d36))
- **blocks:** add default catalog for centralized block management ([e1c23d1](https://github.com/d-zero-dev/BurgerEditor/commit/e1c23d1efa0e2df7a5bb9ea549722c3bbfc08716))
- **blocks:** add horizontal scroll option to table item ([cd758b9](https://github.com/d-zero-dev/BurgerEditor/commit/cd758b91eb0c6f7ff915cdf37f00124bb53a5771))
- **blocks:** add in-page link kind option to button item ([da66803](https://github.com/d-zero-dev/BurgerEditor/commit/da66803c02d0394a3e4e6aff0abb1efea167e795))
- **blocks:** add subtext property to button item ([d517356](https://github.com/d-zero-dev/BurgerEditor/commit/d5173565116082624bf9e9f98bb1b2ca4f4c30d9))
- **blocks:** add text link type option to button item ([ea1f1fb](https://github.com/d-zero-dev/BurgerEditor/commit/ea1f1fbfc9cc487ee963ee8fc4ab2b2277a1d83a))
- **blocks:** add text-image-text block ([b2e3466](https://github.com/d-zero-dev/BurgerEditor/commit/b2e34660d82c27e93e5c3cbd8c34bfd0c2c3826a))
- **blocks:** improve gap control with separate row and column gaps ([26de58b](https://github.com/d-zero-dev/BurgerEditor/commit/26de58b64d5666ee12b8a9e293d9a9b67feae5dd))
- **blocks:** make button kind options configurable via bgeconfig ([cda6b71](https://github.com/d-zero-dev/BurgerEditor/commit/cda6b714ee04b977d71acd5df23e7983ae2f524f))
- **client,blocks:** add semantic container frame UI and styles ([f8a10d4](https://github.com/d-zero-dev/BurgerEditor/commit/f8a10d4902c5895cd07de5d2461039e20bb0f34f))
- **client,core:** add container type selection to block options ([2f766f6](https://github.com/d-zero-dev/BurgerEditor/commit/2f766f6038dfd431edc8aafc9fc6df95ed6bd302))
- **client:** hide inline layout options for immutable single-item blocks ([de71f00](https://github.com/d-zero-dev/BurgerEditor/commit/de71f00937da23834c039c8f8111d3ffda9c5307))
- **client:** update UI to select box for autoRepeat options ([768de75](https://github.com/d-zero-dev/BurgerEditor/commit/768de758dce03339c618da5fa2bad6c5b2944b26))
- **core:** add autoRepeat property to ContainerProps ([9d489df](https://github.com/d-zero-dev/BurgerEditor/commit/9d489dfef100779690f7c1f2533feb596e01bd8d))
- **core:** add changeFrameSemantics method to BurgerBlock ([3a8f4e4](https://github.com/d-zero-dev/BurgerEditor/commit/3a8f4e4d63c7b5416935b75328c2cbd16333eb02))
- **core:** add frameSemantics support to container properties ([50071d0](https://github.com/d-zero-dev/BurgerEditor/commit/50071d036f0de7bdeb4053312cb7cc71a3b42bfa))
- **core:** add SelectableValue type and experimental config support ([d017626](https://github.com/d-zero-dev/BurgerEditor/commit/d0176269050f23fb144d44cf9c740a862a85389b))
- **core:** implement autoRepeat parsing and serialization ([17c509d](https://github.com/d-zero-dev/BurgerEditor/commit/17c509d8d0e4d70bd0751c7607f54e4b7c50cd16))
- **core:** implement health monitoring system with offline detection ([feec3fc](https://github.com/d-zero-dev/BurgerEditor/commit/feec3fca1c7b6e4200ba8072ddbd1923e14abfcc))
- **core:** implement health monitoring system with offline detection ([157baa6](https://github.com/d-zero-dev/BurgerEditor/commit/157baa6ff0cf9fe4a6bce587a8f77505ca996efc))
- **core:** update BlockOptionsDialog for autoRepeat ([d807942](https://github.com/d-zero-dev/BurgerEditor/commit/d8079429ca7d9b6f1571563ec3cbbcceca248b9d))
- **custom-element:** add image support to WYSIWYG editor ([88e1f6b](https://github.com/d-zero-dev/BurgerEditor/commit/88e1f6b5331d7521e5811ff1cf9b40888f4b3908))
- **local:** add experimental button kind config support ([bd7e7fc](https://github.com/d-zero-dev/BurgerEditor/commit/bd7e7fccda3008f097952293bb22202b8bfecbda))
- **local:** add health check API and client integration ([cec6a40](https://github.com/d-zero-dev/BurgerEditor/commit/cec6a40857baf35556bf02363a12822faece7025))
- **local:** add health check API and client integration ([894e441](https://github.com/d-zero-dev/BurgerEditor/commit/894e441b89111f0fcbf256c67d6f66299c05b86a))
- **local:** add text-image-text block to card category ([e12d211](https://github.com/d-zero-dev/BurgerEditor/commit/e12d21177d0139081197bb01599040a6300f2b58))
- **local:** use default catalog from blocks package instead of inline definition ([ff14891](https://github.com/d-zero-dev/BurgerEditor/commit/ff148913c53eabb58a5607316a951a747d98804b))
- **utils:** add generic merge utility with Mergeable type ([5d432a6](https://github.com/d-zero-dev/BurgerEditor/commit/5d432a6dce0c7505e0a05bb7d92421e59b5d96ac))

# [4.0.0-alpha.17](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.16...v4.0.0-alpha.17) (2025-08-25)

### Bug Fixes

- **blocks:** correct image sizing in style.css ([7d18b40](https://github.com/d-zero-dev/BurgerEditor/commit/7d18b4022e3a57c9d95d8ebacbaa6d5b284d4c29))
- **core:** resolve issue with initial property definitions in get-custom-properties ([3e3c3b8](https://github.com/d-zero-dev/BurgerEditor/commit/3e3c3b8e0bd632115de07ece713477b982cbf204))

### Features

- **blocks:** add flexbox styles for wysiwyg elements ([252d69c](https://github.com/d-zero-dev/BurgerEditor/commit/252d69c6d249b1be0d77800a56359bbdb24ee03d))
- **blocks:** update scope selector and adjust container styles ([62d4f2b](https://github.com/d-zero-dev/BurgerEditor/commit/62d4f2baa876e61e46941545ce270f999e0fb61d))
- **core:** change scope selector for custom properties ([d53552c](https://github.com/d-zero-dev/BurgerEditor/commit/d53552c17420ea5d0e3d1fd395654a45afc9ba43))
- **core:** enhance custom property retrieval with nested scope support ([abcd22c](https://github.com/d-zero-dev/BurgerEditor/commit/abcd22cf1afeb0cf1d7fd6404d52ec5034613381))

# [4.0.0-alpha.16](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.15...v4.0.0-alpha.16) (2025-08-22)

### Features

- **blocks:** add initial properties to image elements ([812ffea](https://github.com/d-zero-dev/BurgerEditor/commit/812ffea991ed10988984855f9157c3c2df1e1fb9))

# [4.0.0-alpha.15](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.14...v4.0.0-alpha.15) (2025-08-22)

### Bug Fixes

- **blocks:** change value of --bge-auto-fit-base-width ([cffab33](https://github.com/d-zero-dev/BurgerEditor/commit/cffab33265d3a15c2ae036dd685b1c23b6d8cf7d))
- **blocks:** remove bge-options-border ([88fadfe](https://github.com/d-zero-dev/BurgerEditor/commit/88fadfe2325361e482e1332828063f140b46e475))

### Features

- **client:** update block options to match new specs ([097a505](https://github.com/d-zero-dev/BurgerEditor/commit/097a505bc6057f58582eca7628a3ec2850cc8a89))
- **core, local:** add sampleFilePath support ([aff164b](https://github.com/d-zero-dev/BurgerEditor/commit/aff164bc2e05ea13b2195c53564f8142235a7b2a))
- **core:** add debug mode data logging ([5b8d826](https://github.com/d-zero-dev/BurgerEditor/commit/5b8d8265969aab6a75fa33b509bd42fb8cae7ecc))
- **local:** add newFileContent option for file template ([156ce0d](https://github.com/d-zero-dev/BurgerEditor/commit/156ce0d1b1185db1cb1263173157efc2f3a0433c))

# [4.0.0-alpha.14](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.13...v4.0.0-alpha.14) (2025-08-14)

### Bug Fixes

- **mcp-server:** resolve zod v4 compatibility issue ([a65cf4a](https://github.com/d-zero-dev/BurgerEditor/commit/a65cf4a77f616e31b1d8a6466cd040c38997c428))

### Features

- **local:** implement Front Matter support for HTML files ([29aa6c6](https://github.com/d-zero-dev/BurgerEditor/commit/29aa6c670689ffc894916b248f774038d76fc611))

# [4.0.0-alpha.13](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.12...v4.0.0-alpha.13) (2025-08-13)

### Features

- **local:** add assetsRoot option for separate asset management ([9c09486](https://github.com/d-zero-dev/BurgerEditor/commit/9c094862be7067a39b07b536e2af79e04e633a86))

# [4.0.0-alpha.12](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.11...v4.0.0-alpha.12) (2025-08-08)

### Bug Fixes

- **blocks:** add inline-size 100% to container elements ([4917b5e](https://github.com/d-zero-dev/BurgerEditor/commit/4917b5e600e0eb315853a5d5ec899804d2e98480))
- **blocks:** improve button template structure ([2acd829](https://github.com/d-zero-dev/BurgerEditor/commit/2acd829bdac8d38bc841db63d7a5dbf4a115b0c7))
- **custom-element:** update button-like-link content structure from inline to paragraph ([49a750c](https://github.com/d-zero-dev/BurgerEditor/commit/49a750cbdcaaa12c4d873d296f53cd077b3b590c))
- **github:** resolve Yarn version conflict in CI workflow ([4714dea](https://github.com/d-zero-dev/BurgerEditor/commit/4714dea324282460601ef0d259445ae2b1299d9f))

### Features

- **blocks:** add customizable gap options system ([6257ee1](https://github.com/d-zero-dev/BurgerEditor/commit/6257ee17e0d624c61403f6484b0276c27a7eaafc))
- **blocks:** add default-gutter option for padding-inline ([ef3d893](https://github.com/d-zero-dev/BurgerEditor/commit/ef3d8937a8d5e022fd374c64101e6cf13694d738))
- **blocks:** add responsive width options for container elements ([601f2a4](https://github.com/d-zero-dev/BurgerEditor/commit/601f2a47ae12424316d5037f91d0b1450a6b665e))
- **blocks:** split padding into block and inline variants ([804e331](https://github.com/d-zero-dev/BurgerEditor/commit/804e3313569e15a8dcb8ad77f53729c325e78eb2))
- **blocks:** update CSS custom properties to use double dash separator ([0a37b40](https://github.com/d-zero-dev/BurgerEditor/commit/0a37b40623efbf27e044358c8775fb3310c1692e))
- **core:** change CSS custom property separator from single dash to double dash ([d023d3c](https://github.com/d-zero-dev/BurgerEditor/commit/d023d3cc16dc7f80d1e5ae8562f7f729d8814cc9))

### BREAKING CHANGES

- **core:** CSS custom property naming convention changed from

--bge-options-category-value to --bge-options-category--value

for better readability and parsing

# [4.0.0-alpha.11](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.10...v4.0.0-alpha.11) (2025-08-01)

### Features

- **custom-element:** add wrapper element support for wysiwyg editor ([33bc035](https://github.com/d-zero-dev/BurgerEditor/commit/33bc03545019a4a79b011933c3fb062481940d32))
- **custom-element:** support multiple extensions in bge-wysiwyg-editor-element ([db4891a](https://github.com/d-zero-dev/BurgerEditor/commit/db4891aa9c0a9fcb97c76248d56e8d93ff51f746))

# [4.0.0-alpha.10](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.9...v4.0.0-alpha.10) (2025-08-01)

### Bug Fixes

- **blocks:** prevent fetching image with undefined path ([dc2f50a](https://github.com/d-zero-dev/BurgerEditor/commit/dc2f50aae08dc06b8d43fc3760ceb76f293ac719))
- **client:** adjust font size in UI styles ([7976056](https://github.com/d-zero-dev/BurgerEditor/commit/7976056f40ac058ba9d264bb90ddf47c2e06761f))
- **client:** correct tab border radius properties ([7b4dab0](https://github.com/d-zero-dev/BurgerEditor/commit/7b4dab067c46317d1f1762f0c1f33c29a664995b))
- **client:** validate page number in paginate function ([bc050dc](https://github.com/d-zero-dev/BurgerEditor/commit/bc050dcb645292c2740fc00d102bc9ea54aa48de))
- **core:** resolve updateGridItems bug by correcting DOM element selection ([c6293ba](https://github.com/d-zero-dev/BurgerEditor/commit/c6293baac8512b93c356c8102391aa72b0e429b9))
- **custom-element:** add defining property to descriptionList schema ([ac80688](https://github.com/d-zero-dev/BurgerEditor/commit/ac80688e91bb774d16023c7734255f39d77f8036))
- **custom-element:** reorder BgeWysiwygEditorKit extension loading ([b109d7d](https://github.com/d-zero-dev/BurgerEditor/commit/b109d7df9c4fbc11b085229a9c123e3dd74360a7))
- **frozen-patty:** remove duplicate paths in picture elements ([4c0de54](https://github.com/d-zero-dev/BurgerEditor/commit/4c0de54920a9063edb4b46fb2129a42c9f9967a6))

### Features

- **blocks:** add disclosure block and details item for collapsible content ([6405279](https://github.com/d-zero-dev/BurgerEditor/commit/640527936ba92403e52a91913347717e3e1bf404))
- **blocks:** replace wysiwyg editor with custom element implementation ([c797c01](https://github.com/d-zero-dev/BurgerEditor/commit/c797c01f458357e3928a1551920179c8a761be8d))
- **client:** improve wysiwyg editor spacing and configure stylelint for custom elements ([ff47f4b](https://github.com/d-zero-dev/BurgerEditor/commit/ff47f4b08a0b36cc13559761bfbd7ecbe0e8a531))
- **core:** add async support to item editor open functionality ([62460a9](https://github.com/d-zero-dev/BurgerEditor/commit/62460a986685f132fd498de91847a199919b67e7))
- **core:** add auto-fit grid layout functionality ([09afd9f](https://github.com/d-zero-dev/BurgerEditor/commit/09afd9f8cdd548f00532b79776b104e2b6ddb1ce))
- **core:** add content stylesheet caching to ItemEditorDialog ([f2192bf](https://github.com/d-zero-dev/BurgerEditor/commit/f2192bf52efafba9068222654317cf24a4c9d777))
- **core:** add getCustomProperty function for single property retrieval ([3ac2a37](https://github.com/d-zero-dev/BurgerEditor/commit/3ac2a370e7bb98b6304a83ffa4d737681eb304d6))
- **core:** enhance editor dialog to support shadow DOM elements ([069d9c6](https://github.com/d-zero-dev/BurgerEditor/commit/069d9c65d39cbfa990e95c3a6f677f94a1d50801))
- **core:** integrate custom element initialization and dependency ([1e0fd02](https://github.com/d-zero-dev/BurgerEditor/commit/1e0fd026bc162e15a9d95ea857672e0200dc52ee))
- **custom-element:** add BgeWysiwygEditorElement custom element package ([7a2bd8a](https://github.com/d-zero-dev/BurgerEditor/commit/7a2bd8a3439d6e6efa944519ca210cd241ab481b))
- **custom-element:** add button-like link extension to WYSIWYG editor ([ac322ab](https://github.com/d-zero-dev/BurgerEditor/commit/ac322ab0615ff029e9a7cd7692b6ab6b2fb1e64f))
- **custom-element:** add class name configuration for links and update HTML attributes ([1d4d198](https://github.com/d-zero-dev/BurgerEditor/commit/1d4d1983f1b63a7f81ee43b0ddd87144fad55eb9))
- **custom-element:** add custom extension support to wysiwyg editor ([d7fae4c](https://github.com/d-zero-dev/BurgerEditor/commit/d7fae4c8491892e1e995ed5774f632718b3c589f))
- **custom-element:** add custom table extensions for wysiwyg editor ([ea1ff1f](https://github.com/d-zero-dev/BurgerEditor/commit/ea1ff1f8929dec857af5730ebf824c758ebb5a97))
- **custom-element:** add description list support ([3fc98ae](https://github.com/d-zero-dev/BurgerEditor/commit/3fc98ae49cf027080cbaa9a7c5c6ed4829a34c69))
- **custom-element:** add flex-box extension to wysiwyg editor ([1872892](https://github.com/d-zero-dev/BurgerEditor/commit/18728920599ed9a0f51b8acdad02c149ab4ff9c3))
- **custom-element:** add general-block node and improve description list parsing ([d49d7fd](https://github.com/d-zero-dev/BurgerEditor/commit/d49d7fd20ac3b4332c4d840451a99b791d63b21d))
- **custom-element:** add note block functionality ([1f1566d](https://github.com/d-zero-dev/BurgerEditor/commit/1f1566d617c8484a9304921e144887d40d8b6688))
- **custom-element:** add syncWysiwygToTextarea method ([10b1a0a](https://github.com/d-zero-dev/BurgerEditor/commit/10b1a0a57df0124ac80d907b712946df90acdc08))
- **custom-element:** improve button-like-link toggle behavior and add validation ([7383212](https://github.com/d-zero-dev/BurgerEditor/commit/73832122e508522865cbb2de4e32e53871d24d80))
- **custom-element:** support initial value from innerHTML in bge-wysiwyg-editor-element ([7e269a0](https://github.com/d-zero-dev/BurgerEditor/commit/7e269a0765a9dc91672458e684ab7439e1ce6a5f))
- **local:** add client path validation for sample image path ([efe8edb](https://github.com/d-zero-dev/BurgerEditor/commit/efe8edb4ae35ca20fdc709891e55baf41982cfb6))
- **local:** add disclosure block label in client configuration ([aa80359](https://github.com/d-zero-dev/BurgerEditor/commit/aa80359cc96116e4e9dba5e1d84e58623750caf8))
- **local:** add sample image support and file exclusion to FileListManager ([769717a](https://github.com/d-zero-dev/BurgerEditor/commit/769717a92a0387128f37a71d279ca15487611bff))

# [4.0.0-alpha.9](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.8...v4.0.0-alpha.9) (2025-07-11)

**Note:** Version bump only for package burger-editor_v4

# [4.0.0-alpha.8](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.7...v4.0.0-alpha.8) (2025-07-11)

### Bug Fixes

- **blocks:** change text-image blocks layout from inline to grid ([401c912](https://github.com/d-zero-dev/BurgerEditor/commit/401c912bdfb98f1bd2ef84ad3dbdf8d4eab0c81e))
- **blocks:** correct heading level in title-h3 template ([5b37941](https://github.com/d-zero-dev/BurgerEditor/commit/5b37941ad29b772da8dc418796a0ef9203a71f7b))
- **blocks:** remove unnecessary CSS classes and styles ([eede195](https://github.com/d-zero-dev/BurgerEditor/commit/eede1955f8c301d8e75fae9255d940b7cdf4be6e))
- **blocks:** update background color options ([f14084b](https://github.com/d-zero-dev/BurgerEditor/commit/f14084b40dac082247bc89ac4fa4c414439c9292))
- **client:** change outline display condition to hover only ([4f82950](https://github.com/d-zero-dev/BurgerEditor/commit/4f82950ff0761b5c7bdaaa93c217ab42c511468f))
- **local:** correct type imports and exports paths ([623d4a4](https://github.com/d-zero-dev/BurgerEditor/commit/623d4a4e4bb2404c2f7909d00e3fa722f2febe8e))

### Features

- **blocks:** migrate wysiwyg editor from trix to lexical ([9bf448b](https://github.com/d-zero-dev/BurgerEditor/commit/9bf448bd6e341db08d257fef8315f057699e5637))
- **blocks:** separate container and container frame structure ([ed1e70d](https://github.com/d-zero-dev/BurgerEditor/commit/ed1e70d3f421509a1a5a7c94590a372d235490ef))
- **core:** add CSS layer support for better style management ([8965e42](https://github.com/d-zero-dev/BurgerEditor/commit/8965e42156f1bcd153ebdb04026f5f135c650f7b))
- **core:** filter out null valued custom properties ([37db905](https://github.com/d-zero-dev/BurgerEditor/commit/37db905db3c453c8c59ad5ed5bb58d946c6547a5))
- **local:** add TypeScript type definitions export ([6994c6a](https://github.com/d-zero-dev/BurgerEditor/commit/6994c6a2094e877f17e00db70cd940c29355a6c9))
- **local:** enable stylesheets and add development comment ([b46d5bc](https://github.com/d-zero-dev/BurgerEditor/commit/b46d5bcd8cd8b9e50f7eefb89b24f62a91167639))
- **local:** improve prettier configuration handling in saveContent ([ec889de](https://github.com/d-zero-dev/BurgerEditor/commit/ec889defe412ebaa4b748f6930c70ce08cf01b6c))

# [4.0.0-alpha.7](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.6...v4.0.0-alpha.7) (2025-07-03)

### Features

- **css:** add `@burger-editor/css` ([49c0f0b](https://github.com/d-zero-dev/BurgerEditor/commit/49c0f0b5e466f14c914f168b8a7ab3e417aa27c6))
- **local:** add editable area control functionality ([aae890e](https://github.com/d-zero-dev/BurgerEditor/commit/aae890eea97ab8749a76e0226c0bc93f47fd1087))
- **local:** add prettier formatting to content saving ([d541be9](https://github.com/d-zero-dev/BurgerEditor/commit/d541be90f231d6b407bebddab0cd529cf6997287))

# [4.0.0-alpha.6](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.5...v4.0.0-alpha.6) (2025-06-26)

### Bug Fixes

- **blocks:** add types.d.ts as a public file ([845d6e9](https://github.com/d-zero-dev/BurgerEditor/commit/845d6e97ca22458d0fdfd8a89427e5b6610b0e58))

# [4.0.0-alpha.5](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.4...v4.0.0-alpha.5) (2025-06-26)

### Bug Fixes

- **blocks:** fix alt text editing not reflecting in image item ([79a3cf5](https://github.com/d-zero-dev/BurgerEditor/commit/79a3cf553ffb9b0a9b1e64a5180bd573f8e5f154))
- **blocks:** wrap imported items with data-bgi attribute ([a8ba458](https://github.com/d-zero-dev/BurgerEditor/commit/a8ba458e0e4773122bd448b4f68e71ee29ed742a))
- **core:** ensure values are set after service initialization in item editor ([ca39e68](https://github.com/d-zero-dev/BurgerEditor/commit/ca39e68ffa501d732ac26a390a8a5d831785763c))
- **core:** fix typo in filename from data-form-html to data-from-html ([126a831](https://github.com/d-zero-dev/BurgerEditor/commit/126a831bb48069bc8a473a97dc3742180f7fda53))
- **core:** improve type safety and encoding for item primitive data ([a645fbc](https://github.com/d-zero-dev/BurgerEditor/commit/a645fbc31d215fe1c9c8a395401c446374235d94))
- **core:** update jaco dependency from 4.0.0 to 5.0.0 and fix import path ([e80ea28](https://github.com/d-zero-dev/BurgerEditor/commit/e80ea2801dd43000b830ddb1d764e8ce2aefcebf))
- **frozen-patty:** add src attribute support in getValues ([65b6525](https://github.com/d-zero-dev/BurgerEditor/commit/65b6525a4928861fdf3964ac7a60793b5e742080))
- **repo:** replace list command with lint in test workflow ([b804d78](https://github.com/d-zero-dev/BurgerEditor/commit/b804d788f1a62043883d819d8040ffc69fa1cfae))
- **utils:** align dataConverter execution order with DOM appearance order ([2c7d891](https://github.com/d-zero-dev/BurgerEditor/commit/2c7d891b2d8a4aa0db4503bcf2f2d293d41f1cbe))

### Features

- **blocks:** use CSS variable for last container margin ([2bcca53](https://github.com/d-zero-dev/BurgerEditor/commit/2bcca539d6be83a185dda156d001940bb9b8b393))
- **core:** add primitive data encoding/decoding utils ([a22b33c](https://github.com/d-zero-dev/BurgerEditor/commit/a22b33c23795bcdd1d13626f1436a2d12fefb514))
- **legacy:** add v3 block and item definitions ([9f96786](https://github.com/d-zero-dev/BurgerEditor/commit/9f96786e8445c78e12ad8c53b845df31496f2238))
- **mcp-server:** implement Model Context Protocol server ([3d25043](https://github.com/d-zero-dev/BurgerEditor/commit/3d25043c1d5b98d10585fb57582bb89a6fec5aa8))
- **migrator:** add v3 block creation function ([6c0a83b](https://github.com/d-zero-dev/BurgerEditor/commit/6c0a83b71e5e1d4b439bcaea2a2c2ee37e9b0c38))
- **migrator:** add v3 module with create-block functionality ([89e49d5](https://github.com/d-zero-dev/BurgerEditor/commit/89e49d5f1e3abc4e8c04b8ae5c1dd75566d14bb7))
- **utils:** add replaceCommentWithHTML utility ([22fbff4](https://github.com/d-zero-dev/BurgerEditor/commit/22fbff4a68f892c6069d54225b9bbeccc9146757))

# [4.0.0-alpha.4](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.3...v4.0.0-alpha.4) (2025-04-07)

### Bug Fixes

- **blocks:** remove a column from "1 column image block" ([0bce595](https://github.com/d-zero-dev/BurgerEditor/commit/0bce595f78ff95ec8b589f975757c3684fc0f0a8))
- **frozen-patty:** preserve content while removing dangerous elements in XSS protection ([5c17982](https://github.com/d-zero-dev/BurgerEditor/commit/5c179823a9e0ffde7d618f7b407077c81c92c163))

### Features

- **blocks:** image item supports a picture element and responsive images ([d2f8afe](https://github.com/d-zero-dev/BurgerEditor/commit/d2f8afe5e830b3dd529e8cd09f6126db0494dd1f))
- **client:** add tabs UI ([8518ed2](https://github.com/d-zero-dev/BurgerEditor/commit/8518ed2cf1ef2e6201d28a19cc71128c7edfbdfd))
- **core:** add `tabs` UI type ([8a81c4e](https://github.com/d-zero-dev/BurgerEditor/commit/8a81c4ea7842ae8360fc037d8eea34012ae7497f))
- **core:** item editor supports an array data ([a1e5598](https://github.com/d-zero-dev/BurgerEditor/commit/a1e559826ebddfcea06bd5c63f6303094d0fd471))

# [4.0.0-alpha.3](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.2...v4.0.0-alpha.3) (2025-04-03)

### Bug Fixes

- **local:** set public files ([0da42fe](https://github.com/d-zero-dev/BurgerEditor/commit/0da42fe8fed2135dec43bb363150aa04f0dc04ef))

# [4.0.0-alpha.2](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.1...v4.0.0-alpha.2) (2025-04-03)

### Bug Fixes

- **local:** set public files ([7cf36a7](https://github.com/d-zero-dev/BurgerEditor/commit/7cf36a7e7965f6974231dbdbead2ef8ae28b151c))

# [4.0.0-alpha.1](https://github.com/d-zero-dev/BurgerEditor/compare/v0.10.0...v4.0.0-alpha.1) (2025-04-03)

### Features

- **frozen-patty:** update to ESM ([979a1c8](https://github.com/d-zero-dev/BurgerEditor/commit/979a1c814a79a440a58f4085cc0086ed2f38737b))
- **repo:** create v4 ([1efcf18](https://github.com/d-zero-dev/BurgerEditor/commit/1efcf18e2f59567a87c5589ae057195c31dbc0e8))

### BREAKING CHANGES

- **repo:** created v4
