# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
