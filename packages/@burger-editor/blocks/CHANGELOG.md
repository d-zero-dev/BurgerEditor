# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [4.0.0-alpha.73](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.72...v4.0.0-alpha.73) (2026-09-18)

### Bug Fixes

- **blocks:** fix cross-item FileBrowserStore residual-selection race ([ad59269](https://github.com/d-zero-dev/BurgerEditor/commit/ad59269ccebff337d7f9d137ad65aa0cc97ee9b0))
- **blocks:** fix missing setState dep and adopt shared compiler/mount-effect helpers ([6a0e28d](https://github.com/d-zero-dev/BurgerEditor/commit/6a0e28d8c3ff656e21126e661632011b103f1098))
- **blocks:** stop losing the 2nd image's alt/media in the image item ([f2cb87f](https://github.com/d-zero-dev/BurgerEditor/commit/f2cb87fae7df8d6cb84b129b7f12af2ca9f4c96f))

- feat(blocks)!: adopt React Compiler via @rollup/plugin-babel ([7448dc5](https://github.com/d-zero-dev/BurgerEditor/commit/7448dc5c8c1e953b7432ed4441d84cfaa0b6acb4))
- refactor(core,client,blocks)!: fix remaining render-purity issues ([39dd23e](https://github.com/d-zero-dev/BurgerEditor/commit/39dd23e7d16cfb52a6252d8659000f83d4972283))
- refactor(client)!: replace componentObserver with FileBrowserStore + use() ([adc7b3f](https://github.com/d-zero-dev/BurgerEditor/commit/adc7b3fe9578d0e6b400e87793cba37c60d40bad))
- refactor(core)!: drop componentObserver indirection for select-block ([b60f956](https://github.com/d-zero-dev/BurgerEditor/commit/b60f956e7c94a22579b7746b6b697e1fa9fbd288))
- refactor(client)!: collapse to one React root per engine, add EngineContext ([820e4e6](https://github.com/d-zero-dev/BurgerEditor/commit/820e4e63f4610f64e984011653aadf0403481b01))

### Features

- **blocks:** scope image editor field ids per instance ([9e949e7](https://github.com/d-zero-dev/BurgerEditor/commit/9e949e76f0fcbca18ff0615329180c290eeb4039))

### BREAKING CHANGES

- none to the public API; this is build-tooling only,
  flagged for the same reason as the client commit (compiler is now
  mandatory in the production build, opt out via BGE_NO_COMPILER=1).
- OpenDialogState's 'item-editor' variant gains a
  required containerType: string | undefined field; ItemEditorHost gains
  an optional containerType prop.

Three unrelated render-purity fixes:

google-maps item editor: dropped searchWordRef, a ref mirroring
state.search on every render (`searchWordRef.current = state.search ??
''` in the component body - a render-phase ref write, which
react.dev's own "You Might Not Need an Effect" flags as unnecessary).
The --search-address command handler is itself a fresh closure on every
render (an inline function passed to useCommand), so it already closes
over the current state.search directly - no ref needed. Left
mapRef/markerRef/geocoderRef alone; those hold effect-created imperative
Google Maps objects, a legitimate ref use, not a render-purity issue.

item-editor-host.tsx: containerType was read from the DOM during render
(`item.el.closest('[data-bge-container]')`), a genuine purity violation

- it can also silently go stale if the item gets rebound to a different
  container while its dialog is open. Moved the read into
  UIStateStore.openItemEditor(), which already has the item and runs
  outside React entirely, and threaded the snapshotted value down through
  BurgerEditorRoot -> ItemEditorHost -> ItemEditorBody as a plain prop.

table-editor.tsx: rows were keyed by array index. Reordering (--move-
row-down) or deleting a row in the middle causes React to reuse the
existing DOM node for a given screen position and hand it different
row content - if a textarea was focused mid-edit, the focus and caret
position stay at that screen position while the value underneath swaps
out from under it. Rows now carry a crypto.randomUUID() id (tracked in
local state, seeded once per mount and spliced/updated alongside every
row operation) used as the key instead, so React's reconciliation
follows the row's actual content instead of its position - verified
directly in the local CMS (moved a row down mid-edit and the same
textarea stayed focused with its own value, correctly relabeled to its
new position).

Reviewed but left unchanged: block-options.tsx's CSSOM scan
(engine.getCustomProperties/getRepeatMinInlineSizeVariants) is already
wrapped in useMemo, which is the correct place for an expensive-but-
pure computation - moving it into engine-side caching wouldn't change
its render-purity characteristics, just where the memoization lives.

Verified: full-repo yarn build and yarn lint clean; yarn test:unit
(host, Docker unavailable) 1526/1526 passing outside the VR project
(same pre-existing 24 pixel-size VR failures). Added a new
table-editor.spec.tsx (3 tests, including the exact regression this
fix addresses: moving a focused row down keeps the same DOM element and
its value attached to it) and two openItemEditor tests to
ui-state.spec.ts covering the containerType snapshot. Also verified in
the local CMS: opened the table item editor, focused row A's heading
cell, moved it down, and confirmed the same textarea (same underlying
element) kept focus and its "A" value while visibly moving to the
second position.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>

- removes core's ComponentObserver class and Actions
  type entirely, along with BurgerEditorEngine.componentObserver and
  client's useComponentEvent hook. File selection, upload progress and
  list refresh - the only remaining consumers - now go through a new
  per-engine FileBrowserStore (client/src/file-browser/store.ts),
  reached via useFileBrowser().

Why: componentObserver was a window CustomEvent bus for same-process,
synchronous communication between sibling components (FileList,
FileUploader, Preview, and the item's own Editor). It carried real
async data (a paginated, filterable file list) as loosely-typed
notify() payloads instead of being read as data, with no cache, no
loading/error state, and an implicit "isMounted: false" contract for
triggering the initial fetch.

FileBrowserStore (React-independent, one instance per engine via a
WeakMap):

- read({fileType, page, filter}) returns a cached, stable Promise per
  query - safe to pass straight to use() from render; FileList suspends
  into EditorDialog's Suspense boundary (added in the previous commit)
  while it loads, instead of owning loading state itself
- select/getSnapshot/subscribe track the file currently selected per
  FileType (path + byte size, replacing the old fileSize/isEmpty
  fields) and in-flight upload progress, both read via
  useSyncExternalStore
- upload()/deleteFile() replace the old notify()-driven upload and
  delete flows, invalidating cached pages so the next read() refetches

FileList: reads its page through use(), merges in synthetic
"uploading…" rows from the store's uploads (replacing the old
notify('file-listup')-driven splice), and wraps pagination/deletion in
startTransition so pending pages don't hide already-rendered content;
search filtering goes through useDeferredValue instead of a manual
300ms debounce.

FileUploader: delegates to store.upload(), wrapped in startTransition
(React 19's async-transition support keeps isPending true across the
awaited upload).

Preview: reads upload progress from the store instead of subscribing
to componentObserver; the previewed path is still a prop from the
item's own state, unchanged.

ImageEditor/download-file: call store.select() instead of
notify('file-select'), and react to externally-driven selection changes
(a file picked in FileList) via useSyncExternalStore + an effect guarded
against re-applying a selection the component itself just made (so the
mount-time seed and a real external change don't double-fire).

Also folds in two small, unrelated-but-adjacent cleanups already queued
for this pass: BlockMenu now calls engine.setCurrentBlock(block)
directly instead of round-tripping through componentObserver's
'select-block' action (which only ever had the engine's own constructor
listening on it), and the image editor's 'update-css-width' action -
which had no consumer beyond its own spec file - is gone in favor of
asserting state.cssWidth directly.

Simplifications made deliberately, not discovered as gaps: the initial
getFileList call no longer receives a `selected` hint for server-side
pagination positioning (doing so purely would require writing to the
external store synchronously during render, which is unsafe under
StrictMode/concurrent rendering); an item's initial file selection is
seeded via a mount effect instead, so the very first paint may highlight
nothing until that effect runs. Upload blob URLs are still never
revoked (matching the prior implementation - out of scope here).

Verified: full-repo yarn build and yarn lint clean; yarn test:unit
(host, Docker unavailable) 1496/1496 passing outside the VR project
across three consecutive runs (same pre-existing 24 pixel-size VR
failures; local's fs-watcher spec - real filesystem events, unrelated
to this change - flaked under load on two runs and passed clean on a
third).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>

- removes the 'select-block' and 'update-css-width'
  entries from core's Actions type (and ComponentObserver can no longer
  be subscribed to either).

BlockMenu called engine.componentObserver.notify('select-block', ...)
purely so the engine's own constructor-registered listener could turn
around and call engine.setCurrentBlock(block) - an indirection through
a window CustomEvent bus for something that was always a same-process,
synchronous call. BlockMenu now calls engine.setCurrentBlock(block)
directly; the constructor no longer registers that listener.

'update-css-width' had no real consumer at all - it existed solely so
image/editor.spec.tsx could observe the notify call. The image editor
already threads the same value through React state
(state.cssWidth via setState), so the test now asserts against that
state directly instead of subscribing to the observer.

component-observer.spec.ts exercised these two payload shapes purely
as a generic stand-in for testing ComponentObserver's own on/notify/off
mechanics (multiple listeners, disposal, instance isolation) - switched
to 'file-select', an Action that still exists.

Verified: full-repo yarn build and yarn lint clean; yarn test:unit
(host, Docker unavailable) 1508/1508 passing outside the VR project
across three consecutive runs (same pre-existing 24 pixel-size VR
failures; a handful of unrelated timing-sensitive tests - cli bin.spec,
mcp-server startup-log, local fs-watcher/ws - flaked once each under
concurrent load and passed clean on rerun).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>

- `ItemEditorProps` no longer includes `engine` or
  `config` — item `Editor` components must use `useEngine()` /
  `useEngine().config` instead. Updated the 4 built-in items that used
  them (`image`, `download-file`, `google-maps` isDisable is unaffected,
  `button`). `toEditorState`/`toItemData` keep their `config` parameter
  (they run outside React). `DraftSwitcher` now takes no props (was
  `{engine}`); `attachDraftSwitcher` wraps it in an `EngineProvider`
  itself. `BlockCatalog`/`BlockOptions`/`ItemEditorHost` drop `engine`
  from their prop types.

Updated ARCHITECTURE.md §4/§6, core/README.md's createItem sample and
argument table, client/README.md, all affected spec files (added a
shared `renderWithEngine()` test helper), and storybook stories (each
introduces a thin story-only wrapper component so existing `args`
shapes and `play` functions keep working unchanged).

Verified: full-repo `yarn build` and `yarn lint` clean; `yarn test:unit`
(host, Docker unavailable in this environment) is 1503/1503 passing
outside the VR project — the 24 VR failures are pixel-size mismatches
from running Playwright screenshots on host macOS instead of the
`bge-vr` Docker image the project requires for CI-identical rendering,
not a regression (VR fixtures are hand-written HTML, decoupled from
this change).

# [4.0.0-alpha.72](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.71...v4.0.0-alpha.72) (2026-09-02)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.71](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.70...v4.0.0-alpha.71) (2026-08-11)

### Bug Fixes

- **blocks:** move image editor state seeding out of the mount effect ([2985290](https://github.com/d-zero-dev/BurgerEditor/commit/29852901b55517a8f1f988903547863525acc1d4))
- **blocks:** own the image editor tab panel label in the panel JSX ([f4de051](https://github.com/d-zero-dev/BurgerEditor/commit/f4de051085d9862fc45ce566cfb3bf2570ed286e))
- **blocks:** restore the google-maps API-key guard and fix alt corruption on tab switch ([b52cb87](https://github.com/d-zero-dev/BurgerEditor/commit/b52cb87504d2b9ac6e36c55a42b3de6064b00ae5))
- **blocks:** surface image load failures in the editor ([6098a81](https://github.com/d-zero-dev/BurgerEditor/commit/6098a81f5f08beae637eb03b192bf6126d6ed389))

- refactor(client)!: flatten src/react into src and rename the subpath to ./ui ([5086a1a](https://github.com/d-zero-dev/BurgerEditor/commit/5086a1a5a369aef22cdd6f5c2d976f5bf2336bef))

### Features

- **blocks:** migrate 9 items to the Editor component contract ([ade6f8d](https://github.com/d-zero-dev/BurgerEditor/commit/ade6f8d3b53b2ef63414433652234c7af0e75371))
- **blocks:** migrate image/table/wysiwyg editors to React ([a3a1f76](https://github.com/d-zero-dev/BurgerEditor/commit/a3a1f76ff37aa78958ad6c7181200d42ec73df64))

### BREAKING CHANGES

- the "@burger-editor/client/react" entry is now
  "@burger-editor/client/ui" (dist/ui.js). With Svelte gone the react
  qualifier carried no information; components/form/commands/hooks now
  live directly under src/. The lightweight entry itself stays so blocks
  consumers (cli/mcp-server) keep avoiding the full client bundle.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

# [4.0.0-alpha.70](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.69...v4.0.0-alpha.70) (2026-06-12)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.69](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.68...v4.0.0-alpha.69) (2026-06-12)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.68](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.67...v4.0.0-alpha.68) (2026-06-12)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.67](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.66...v4.0.0-alpha.67) (2026-06-11)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.66](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.65...v4.0.0-alpha.66) (2026-05-12)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.65](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.64...v4.0.0-alpha.65) (2026-04-08)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.64](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.63...v4.0.0-alpha.64) (2026-03-30)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.63](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.62...v4.0.0-alpha.63) (2026-03-10)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.62](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.61...v4.0.0-alpha.62) (2026-03-10)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.61](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.60...v4.0.0-alpha.61) (2026-02-18)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.60](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.59...v4.0.0-alpha.60) (2026-02-16)

### Features

- **blocks:** add repeat-min-inline-size CSS presets for grid auto-fit/auto-fill ([4c5149d](https://github.com/d-zero-dev/BurgerEditor/commit/4c5149d2d98c2908e4425aae184601b2daf3799d))

# [4.0.0-alpha.59](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.58...v4.0.0-alpha.59) (2026-02-12)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.58](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.57...v4.0.0-alpha.58) (2026-02-05)

### Bug Fixes

- **blocks:** replace unset with revert for image aspectRatio ([9a9c99e](https://github.com/d-zero-dev/BurgerEditor/commit/9a9c99eb230818797d79f2f495b22f146bf00b29))

# [4.0.0-alpha.57](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.56...v4.0.0-alpha.57) (2026-02-03)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.56](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.55...v4.0.0-alpha.56) (2026-01-23)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.55](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.54...v4.0.0-alpha.55) (2026-01-23)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.54](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.53...v4.0.0-alpha.54) (2026-01-22)

### Features

- **blocks:** add paragraph alignment styles to general.css ([6f2a50e](https://github.com/d-zero-dev/BurgerEditor/commit/6f2a50ea8b4d6d728549bf28fdbdb89a738c0e87))

# [4.0.0-alpha.53](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.52...v4.0.0-alpha.53) (2026-01-22)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.52](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.51...v4.0.0-alpha.52) (2026-01-21)

### Features

- **blocks:** add auto-fit to all grid layouts in default catalog ([f94204c](https://github.com/d-zero-dev/BurgerEditor/commit/f94204c86e560777a03401cd67914c7c65dba1a1))

# [4.0.0-alpha.51](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.50...v4.0.0-alpha.51) (2026-01-16)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.50](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.49...v4.0.0-alpha.50) (2026-01-15)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.49](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.48...v4.0.0-alpha.49) (2026-01-15)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.48](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.47...v4.0.0-alpha.48) (2026-01-08)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.47](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.46...v4.0.0-alpha.47) (2026-01-06)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.46](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.45...v4.0.0-alpha.46) (2026-01-06)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.45](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.44...v4.0.0-alpha.45) (2025-12-26)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.44](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.43...v4.0.0-alpha.44) (2025-12-25)

### Bug Fixes

- **blocks:** correct initial button kind data ([cb23669](https://github.com/d-zero-dev/BurgerEditor/commit/cb236696a94f705992ce6b6633ad366d8b0bf829))

# [4.0.0-alpha.43](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.42...v4.0.0-alpha.43) (2025-12-24)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.42](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.41...v4.0.0-alpha.42) (2025-12-11)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.34](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.33...v4.0.0-alpha.34) (2025-12-01)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.33](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.32...v4.0.0-alpha.33) (2025-12-01)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.32](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.31...v4.0.0-alpha.32) (2025-12-01)

### Bug Fixes

- **blocks:** add null safety checks in image item beforeOpen ([0c2a193](https://github.com/d-zero-dev/BurgerEditor/commit/0c2a193c3f395ac00f2345011af17cec3fc61e91))
- **blocks:** initialize width state maxNumber and CSS width ([36b28b5](https://github.com/d-zero-dev/BurgerEditor/commit/36b28b5c230119fe808592392cce439cf91f9dfb))
- **core:** add instance ID to ComponentObserver events ([17741ac](https://github.com/d-zero-dev/BurgerEditor/commit/17741acaebc528bd33148e0d15613dd068a45b57))

### Features

- **blocks:** add css property to width state debug output ([be74a64](https://github.com/d-zero-dev/BurgerEditor/commit/be74a647572e5c19a8b5bf5c52bdf59a8f899305))
- **blocks:** add debug flag to control console error output ([d60b505](https://github.com/d-zero-dev/BurgerEditor/commit/d60b505f3f41a641ae25155148c7963274bd7343))
- **blocks:** disable size fieldset during image loading ([75b5730](https://github.com/d-zero-dev/BurgerEditor/commit/75b57305ad98f0797c2b4901a5a2c286f75c6a85))
- **blocks:** notify css-width update via componentObserver ([821dd13](https://github.com/d-zero-dev/BurgerEditor/commit/821dd13fb1129a717eba9e966ece1455b6dca660))

# [4.0.0-alpha.31](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.30...v4.0.0-alpha.31) (2025-11-26)

### Bug Fixes

- **blocks:** correct relative paths in README links ([71096da](https://github.com/d-zero-dev/BurgerEditor/commit/71096dae67cfe8e83bd40d7fde5ae33413b1bf30))

# [4.0.0-alpha.30](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.29...v4.0.0-alpha.30) (2025-11-13)

### Bug Fixes

- **blocks:** set image margin-inline to auto ([180dfb2](https://github.com/d-zero-dev/BurgerEditor/commit/180dfb2f3043912fb2e7591c4ac3a0e65cad1018))

# [4.0.0-alpha.29](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.28...v4.0.0-alpha.29) (2025-10-22)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.28](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.27...v4.0.0-alpha.28) (2025-10-22)

### Features

- **blocks:** add import item for HTML file import ([c7684ed](https://github.com/d-zero-dev/BurgerEditor/commit/c7684eda4426253d4de645ebf10399d33160e5ba))

# [4.0.0-alpha.27](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.26...v4.0.0-alpha.27) (2025-10-08)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.26](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.25...v4.0.0-alpha.26) (2025-10-08)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.25](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.24...v4.0.0-alpha.25) (2025-09-19)

### Bug Fixes

- **blocks:** remove unnecessary border property from options container ([1bc5c3e](https://github.com/d-zero-dev/BurgerEditor/commit/1bc5c3e71dad05fd5911d078d9c3aeafa1c0f988))

# [4.0.0-alpha.24](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.23...v4.0.0-alpha.24) (2025-09-19)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.23](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.22...v4.0.0-alpha.23) (2025-09-19)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.22](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.21...v4.0.0-alpha.22) (2025-09-19)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.21](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.20...v4.0.0-alpha.21) (2025-09-19)

### Features

- **blocks:** enhance button item editor with icon support ([b55ad84](https://github.com/d-zero-dev/BurgerEditor/commit/b55ad844591006f87f6c4ac622953e4c9cda701d))
- **blocks:** implement new data-driven block catalog system ([6bd0b0e](https://github.com/d-zero-dev/BurgerEditor/commit/6bd0b0e8098f28c7f40eaebd6097ca86b5377b89))

# [4.0.0-alpha.20](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.19...v4.0.0-alpha.20) (2025-09-11)

### Bug Fixes

- **blocks:** improve immutable container flex layout structure ([8f732b7](https://github.com/d-zero-dev/BurgerEditor/commit/8f732b7e10b685918ebd9c92f111769e2ef12f52))

# [4.0.0-alpha.19](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.18...v4.0.0-alpha.19) (2025-09-11)

### Bug Fixes

- **blocks:** resolve inline 2 columns sizing issues ([737155e](https://github.com/d-zero-dev/BurgerEditor/commit/737155ee9ffa5b88635c83cd331276a994dca372))
- **blocks:** wrap content-navigation items with data-bge-group ([9389172](https://github.com/d-zero-dev/BurgerEditor/commit/9389172f24d1b21747ca0f2725b488ecf7f8c425))

# [4.0.0-alpha.18](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.17...v4.0.0-alpha.18) (2025-09-11)

### Bug Fixes

- **blocks:** improve item layout with flexbox alignment and stretching ([64185c9](https://github.com/d-zero-dev/BurgerEditor/commit/64185c9296983ec916ffc185aa8b3d34f9b43176))

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

# [4.0.0-alpha.17](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.16...v4.0.0-alpha.17) (2025-08-25)

### Bug Fixes

- **blocks:** correct image sizing in style.css ([7d18b40](https://github.com/d-zero-dev/BurgerEditor/commit/7d18b4022e3a57c9d95d8ebacbaa6d5b284d4c29))

### Features

- **blocks:** add flexbox styles for wysiwyg elements ([252d69c](https://github.com/d-zero-dev/BurgerEditor/commit/252d69c6d249b1be0d77800a56359bbdb24ee03d))
- **blocks:** update scope selector and adjust container styles ([62d4f2b](https://github.com/d-zero-dev/BurgerEditor/commit/62d4f2baa876e61e46941545ce270f999e0fb61d))

# [4.0.0-alpha.16](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.15...v4.0.0-alpha.16) (2025-08-22)

### Features

- **blocks:** add initial properties to image elements ([812ffea](https://github.com/d-zero-dev/BurgerEditor/commit/812ffea991ed10988984855f9157c3c2df1e1fb9))

# [4.0.0-alpha.15](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.14...v4.0.0-alpha.15) (2025-08-22)

### Bug Fixes

- **blocks:** change value of --bge-auto-fit-base-width ([cffab33](https://github.com/d-zero-dev/BurgerEditor/commit/cffab33265d3a15c2ae036dd685b1c23b6d8cf7d))
- **blocks:** remove bge-options-border ([88fadfe](https://github.com/d-zero-dev/BurgerEditor/commit/88fadfe2325361e482e1332828063f140b46e475))

### Features

- **client:** update block options to match new specs ([097a505](https://github.com/d-zero-dev/BurgerEditor/commit/097a505bc6057f58582eca7628a3ec2850cc8a89))

# [4.0.0-alpha.14](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.13...v4.0.0-alpha.14) (2025-08-14)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.13](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.12...v4.0.0-alpha.13) (2025-08-13)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.12](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.11...v4.0.0-alpha.12) (2025-08-08)

### Bug Fixes

- **blocks:** add inline-size 100% to container elements ([4917b5e](https://github.com/d-zero-dev/BurgerEditor/commit/4917b5e600e0eb315853a5d5ec899804d2e98480))
- **blocks:** improve button template structure ([2acd829](https://github.com/d-zero-dev/BurgerEditor/commit/2acd829bdac8d38bc841db63d7a5dbf4a115b0c7))

### Features

- **blocks:** add customizable gap options system ([6257ee1](https://github.com/d-zero-dev/BurgerEditor/commit/6257ee17e0d624c61403f6484b0276c27a7eaafc))
- **blocks:** add default-gutter option for padding-inline ([ef3d893](https://github.com/d-zero-dev/BurgerEditor/commit/ef3d8937a8d5e022fd374c64101e6cf13694d738))
- **blocks:** add responsive width options for container elements ([601f2a4](https://github.com/d-zero-dev/BurgerEditor/commit/601f2a47ae12424316d5037f91d0b1450a6b665e))
- **blocks:** split padding into block and inline variants ([804e331](https://github.com/d-zero-dev/BurgerEditor/commit/804e3313569e15a8dcb8ad77f53729c325e78eb2))
- **blocks:** update CSS custom properties to use double dash separator ([0a37b40](https://github.com/d-zero-dev/BurgerEditor/commit/0a37b40623efbf27e044358c8775fb3310c1692e))

# [4.0.0-alpha.11](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.10...v4.0.0-alpha.11) (2025-08-01)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.10](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.9...v4.0.0-alpha.10) (2025-08-01)

### Bug Fixes

- **blocks:** prevent fetching image with undefined path ([dc2f50a](https://github.com/d-zero-dev/BurgerEditor/commit/dc2f50aae08dc06b8d43fc3760ceb76f293ac719))

### Features

- **blocks:** add disclosure block and details item for collapsible content ([6405279](https://github.com/d-zero-dev/BurgerEditor/commit/640527936ba92403e52a91913347717e3e1bf404))
- **blocks:** replace wysiwyg editor with custom element implementation ([c797c01](https://github.com/d-zero-dev/BurgerEditor/commit/c797c01f458357e3928a1551920179c8a761be8d))
- **core:** add auto-fit grid layout functionality ([09afd9f](https://github.com/d-zero-dev/BurgerEditor/commit/09afd9f8cdd548f00532b79776b104e2b6ddb1ce))

# [4.0.0-alpha.9](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.8...v4.0.0-alpha.9) (2025-07-11)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.8](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.7...v4.0.0-alpha.8) (2025-07-11)

### Bug Fixes

- **blocks:** change text-image blocks layout from inline to grid ([401c912](https://github.com/d-zero-dev/BurgerEditor/commit/401c912bdfb98f1bd2ef84ad3dbdf8d4eab0c81e))
- **blocks:** correct heading level in title-h3 template ([5b37941](https://github.com/d-zero-dev/BurgerEditor/commit/5b37941ad29b772da8dc418796a0ef9203a71f7b))
- **blocks:** remove unnecessary CSS classes and styles ([eede195](https://github.com/d-zero-dev/BurgerEditor/commit/eede1955f8c301d8e75fae9255d940b7cdf4be6e))
- **blocks:** update background color options ([f14084b](https://github.com/d-zero-dev/BurgerEditor/commit/f14084b40dac082247bc89ac4fa4c414439c9292))

### Features

- **blocks:** migrate wysiwyg editor from trix to lexical ([9bf448b](https://github.com/d-zero-dev/BurgerEditor/commit/9bf448bd6e341db08d257fef8315f057699e5637))
- **blocks:** separate container and container frame structure ([ed1e70d](https://github.com/d-zero-dev/BurgerEditor/commit/ed1e70d3f421509a1a5a7c94590a372d235490ef))
- **core:** add CSS layer support for better style management ([8965e42](https://github.com/d-zero-dev/BurgerEditor/commit/8965e42156f1bcd153ebdb04026f5f135c650f7b))

# [4.0.0-alpha.7](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.6...v4.0.0-alpha.7) (2025-07-03)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.6](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.5...v4.0.0-alpha.6) (2025-06-26)

### Bug Fixes

- **blocks:** add types.d.ts as a public file ([845d6e9](https://github.com/d-zero-dev/BurgerEditor/commit/845d6e97ca22458d0fdfd8a89427e5b6610b0e58))

# [4.0.0-alpha.5](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.4...v4.0.0-alpha.5) (2025-06-26)

### Bug Fixes

- **blocks:** fix alt text editing not reflecting in image item ([79a3cf5](https://github.com/d-zero-dev/BurgerEditor/commit/79a3cf553ffb9b0a9b1e64a5180bd573f8e5f154))
- **blocks:** wrap imported items with data-bgi attribute ([a8ba458](https://github.com/d-zero-dev/BurgerEditor/commit/a8ba458e0e4773122bd448b4f68e71ee29ed742a))

### Features

- **blocks:** use CSS variable for last container margin ([2bcca53](https://github.com/d-zero-dev/BurgerEditor/commit/2bcca539d6be83a185dda156d001940bb9b8b393))
- **utils:** add replaceCommentWithHTML utility ([22fbff4](https://github.com/d-zero-dev/BurgerEditor/commit/22fbff4a68f892c6069d54225b9bbeccc9146757))

# [4.0.0-alpha.4](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.3...v4.0.0-alpha.4) (2025-04-07)

### Bug Fixes

- **blocks:** remove a column from "1 column image block" ([0bce595](https://github.com/d-zero-dev/BurgerEditor/commit/0bce595f78ff95ec8b589f975757c3684fc0f0a8))

### Features

- **blocks:** image item supports a picture element and responsive images ([d2f8afe](https://github.com/d-zero-dev/BurgerEditor/commit/d2f8afe5e830b3dd529e8cd09f6126db0494dd1f))

# [4.0.0-alpha.3](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.2...v4.0.0-alpha.3) (2025-04-03)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.2](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.1...v4.0.0-alpha.2) (2025-04-03)

**Note:** Version bump only for package @burger-editor/blocks

# [4.0.0-alpha.1](https://github.com/d-zero-dev/BurgerEditor/compare/v0.10.0...v4.0.0-alpha.1) (2025-04-03)

### Features

- **repo:** create v4 ([1efcf18](https://github.com/d-zero-dev/BurgerEditor/commit/1efcf18e2f59567a87c5589ae057195c31dbc0e8))

### BREAKING CHANGES

- **repo:** created v4
