# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [4.0.0-alpha.68](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.67...v4.0.0-alpha.68) (2026-06-12)

- feat(file-io)!: lenient loadResolverState by default, propagate I/O errors ([1e32026](https://github.com/d-zero-dev/BurgerEditor/commit/1e320260bb7c736bebad65b71089219b716f94f9))

### BREAKING CHANGES

- loadResolverState now returns { state, invalid } instead of
  ResolverState directly. Pass { strict: true } to opt back into throw-fast
  behavior (recommended for boot-time validation in the local server).

Migration projects routinely contain legacy redirect stubs or pre-conversion
files without the expected pathKey Front Matter; the previous strict behavior
threw on the first such file and locked the CLI/MCP out of the rest of the
project. Lenient mode collects per-file Front Matter dirt into an invalid
array while preserving the rest.

Details:

- ResolverInvalidEntry reasons: missing-key / invalid-type / empty-path
- fs.readFile I/O errors (EACCES, EBUSY, EIO) propagate in BOTH modes — they
  are operational faults, not dirt, and must not be silently masked
- PathConflictError still throws in both modes (structural ambiguity)
- export new types: LoadResolverStateOptions, LoadResolverStateResult,
  ResolverInvalidEntry
- pin lenient/strict pair and an I/O error propagation regression test
- add NoEditableAreaError candidate-selectors regression test for saveContent
- README documents lenient/strict modes with reason table

# [4.0.0-alpha.67](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.66...v4.0.0-alpha.67) (2026-06-11)

### Bug Fixes

- **file-io:** walk up for config, fix path semantics, lazy DOM, ENOENT race, plus tests + README ([1563147](https://github.com/d-zero-dev/BurgerEditor/commit/156314723991143cd792cd601b13c8028e91d062))

### Features

- **file-io:** add Node-side package for config and page I/O ([da813ae](https://github.com/d-zero-dev/BurgerEditor/commit/da813ae700cb91d46f7ad5e17d2ae7b49747b167))
