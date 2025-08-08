# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
