# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [4.0.0-alpha.73](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.72...v4.0.0-alpha.73) (2026-09-18)

### Bug Fixes

- **core:** dedupe currentBlock state and cache in-flight stylesheet fetch ([935470a](https://github.com/d-zero-dev/BurgerEditor/commit/935470a8ab95e9328e79c1b4e2a004dd6d1d9828))

- refactor(core,client,blocks)!: fix remaining render-purity issues ([39dd23e](https://github.com/d-zero-dev/BurgerEditor/commit/39dd23e7d16cfb52a6252d8659000f83d4972283))
- refactor(client)!: replace componentObserver with FileBrowserStore + use() ([adc7b3f](https://github.com/d-zero-dev/BurgerEditor/commit/adc7b3fe9578d0e6b400e87793cba37c60d40bad))
- refactor(core)!: drop componentObserver indirection for select-block ([b60f956](https://github.com/d-zero-dev/BurgerEditor/commit/b60f956e7c94a22579b7746b6b697e1fa9fbd288))
- refactor(client)!: collapse to one React root per engine, add EngineContext ([820e4e6](https://github.com/d-zero-dev/BurgerEditor/commit/820e4e63f4610f64e984011653aadf0403481b01))

### Features

- **core:** scope command bus and root element per engine instance ([1f0543c](https://github.com/d-zero-dev/BurgerEditor/commit/1f0543cb66dca9736b3666fdab382b3da291cb9e))

### BREAKING CHANGES

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

### Bug Fixes

- **core:** add replaceContents to rebind blocks after HTML replacement ([e42a178](https://github.com/d-zero-dev/BurgerEditor/commit/e42a178a09c232dbc689a7da0136ab744a071c5c))
- **core:** align live update-item's itemIndex with the disk-side item enumeration ([25a6895](https://github.com/d-zero-dev/BurgerEditor/commit/25a6895df72160fe3879eec5ce350ccd80d817df))
- **core:** dispose partial engine construction on failure, fix this-binding ([7e5dcb2](https://github.com/d-zero-dev/BurgerEditor/commit/7e5dcb2248978c5a022c7fd4ac899bfdb21b27f8))
- **core:** make live block ops work with an iframe-hosted editable area ([460b23b](https://github.com/d-zero-dev/BurgerEditor/commit/460b23b554d0636249b64751114004c5d68f3d6d))
- **core:** scope highlightElement's scrollend listener to the target's window ([da6596e](https://github.com/d-zero-dev/BurgerEditor/commit/da6596e2166129ba3aa0437bd8bdaf53b2fd6c77))

### Features

- **core:** add live block-ops for browser-side agent application ([d7394fd](https://github.com/d-zero-dev/BurgerEditor/commit/d7394fda533efe6275d4f6f4c970ecce4fd14d06))
- **core:** add Symbol.dispose to HealthMonitor/CommandBus/ComponentObserver/engine ([ba45fe0](https://github.com/d-zero-dev/BurgerEditor/commit/ba45fe0ed7c15960e723e53420841a0ccce61eea))
- **core:** let applyLiveBlockOp callers hook in right before the DOM mutates ([e13debe](https://github.com/d-zero-dev/BurgerEditor/commit/e13debe299d42ee5551c128ef6730063a0cab0cf))

# [4.0.0-alpha.71](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.70...v4.0.0-alpha.71) (2026-08-11)

### Bug Fixes

- **client:** snapshot the target block into the block-options dialog state ([a7059fb](https://github.com/d-zero-dev/BurgerEditor/commit/a7059fb18f6f935e8b409b5244f0b82645e7eca4))
- **core:** apply frame semantics from block options form data on submit ([844a467](https://github.com/d-zero-dev/BurgerEditor/commit/844a4670cbde655a309f28c5bcc8629ef682672c))
- **core:** give Item access to the engine config for isDisable hooks ([5a962f0](https://github.com/d-zero-dev/BurgerEditor/commit/5a962f085a591e74cf11f0eced8b6ba8aa523524))
- **core:** make block-insertion animation completion reliable ([e257399](https://github.com/d-zero-dev/BurgerEditor/commit/e257399dffc22bad69bc63ded4310cb2b80d843f))
- **core:** refuse draft⇄main copies that would erase or no-op ([b8cd6fa](https://github.com/d-zero-dev/BurgerEditor/commit/b8cd6fada93785b00d3d30041908e626a52d02b9))
- **core:** stop forcing blockMenu hidden via direct DOM writes ([83dcfa2](https://github.com/d-zero-dev/BurgerEditor/commit/83dcfa2ad27c7030b5b60d0a0af07df3cb3591b8))
- **core:** stop passing containerElement itself to BurgerBlock.rebind ([fd1747d](https://github.com/d-zero-dev/BurgerEditor/commit/fd1747d305f9543790a3d7c02288febe1d04b954))

- refactor(core)!: replace the three UI factory contracts with a single view port ([0e5b526](https://github.com/d-zero-dev/BurgerEditor/commit/0e5b526a3f694fe15051756b70a5e7c7a5feea77))
- refactor(client)!: flatten src/react into src and rename the subpath to ./ui ([5086a1a](https://github.com/d-zero-dev/BurgerEditor/commit/5086a1a5a369aef22cdd6f5c2d976f5bf2336bef))
- feat(core)!: remove the class-based dialog UI and go headless ([e10f05b](https://github.com/d-zero-dev/BurgerEditor/commit/e10f05b387d0cb2a2fa1a308803a325d29cfb0ec))

### Features

- **core:** add command bus and UI state store ([a4647e2](https://github.com/d-zero-dev/BurgerEditor/commit/a4647e2fa90491ec97ee5dc458d820e357187b5d))
- **core:** add component-based item editor contract types ([2c8a8b6](https://github.com/d-zero-dev/BurgerEditor/commit/2c8a8b6d72103d3a99dfe8fa8fed9cacd59698a5))
- **core:** define the engine command vocabulary ([ede3fae](https://github.com/d-zero-dev/BurgerEditor/commit/ede3fae665704465d5c87ce30a3f7e4a9d16ce39))
- **core:** make legacy editor template optional and pass config to toItemData ([c6e8e13](https://github.com/d-zero-dev/BurgerEditor/commit/c6e8e13410a83ff53fcf8eb0aee6badbee467af6))
- **core:** return per-listener unsubscribe from ComponentObserver.on ([189e433](https://github.com/d-zero-dev/BurgerEditor/commit/189e43300e115ca6c0690083e5e84c90d584beec))
- **core:** track processing and source-mode flags in the UI state store ([0754b71](https://github.com/d-zero-dev/BurgerEditor/commit/0754b7197c9bfc8e69938b57fe4bb03fa8fc3c53))
- **utils:** add appendStylesheetTo dom helper ([5af1846](https://github.com/d-zero-dev/BurgerEditor/commit/5af1846ce9bf55aae47044bcfcc625756a17e0cd))

### BREAKING CHANGES

- BurgerEditorEngineOptions no longer accepts blockMenu /
  initialInsertionButton / editableAreaShell; it takes an optional `view`
  (BurgerEditorView) instead. EditableArea is split: content concerns stay
  in core as EditableContent, presentation moves to @burger-editor/client.

The engine now holds no reference to UI-owned DOM except each area's
containerElement, so the class of bug where the engine writes attributes
that React also renders (block menu stuck hidden) is unrepresentable:

- core: EditableContent keeps block restoration / serialization /
  sanitization; EditorUI (hidden-attribute base class) is deleted;
  InsertionPoint delegates its animation to the host and no longer
  drives area updates; the engine's #show only switches the current
  pointer and dispatches bge:switch-content
- client: EditableAreaView renders the iframe/textarea shell with
  React state (visibility, visual/source mode, ResizeObserver-driven
  height) and portals BlockMenu and the initial insertion button into
  the iframe body — no extra React roots, no leaked window listeners
- BlockMenu hides itself by subscribing to uiState.processing (the
  forwardRef escape hatch is gone); DraftSwitcher reads
  uiState.sourceMode instead of duplicating it locally
- the dead onInsert callback and the discarded factory cleanUp handles
  disappear together with the factory contracts; engine.cleanUp() now
  destroys the injected view

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

- the "@burger-editor/client/react" entry is now
  "@burger-editor/client/ui" (dist/ui.js). With Svelte gone the react
  qualifier carried no information; components/form/commands/hooks now
  live directly under src/. The lightweight entry itself stays so blocks
  consumers (cli/mcp-server) keep avoiding the full client bundle.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

- the imperative dialog layer is gone. EditorDialog,
  ItemEditorDialog, BlockCatalogDialog, BlockOptionsDialog, BlockMenu,
  InitialInsertionButton, ItemEditorService and getItemEditorTemplate
  are removed, along with the UIOptions/UICreator/EditorDialogShellCreator
  DI contracts and the [data-bge-editor-ui] marker scanning. The UI layer
  now subscribes to engine.uiState and renders dialogs declaratively.

* Item no longer holds an editor dialog or a click listener; opening
  the editor is a UI-layer concern (uiState.openItemEditor). Item
  exposes its seed; import() is synchronous and no longer runs
  beforeChange
* ItemEditorOptions keeps only isDisable; the editor string field,
  open/beforeOpen/beforeChange/onSubmit hooks and customData are gone
  (replaced by Editor/toEditorState/toItemData)
* applyBlockOptions(): the block options form application extracted
  from BlockOptionsDialog for reuse by the declarative dialog
* engine exposes catalog and getContentStylesheet(); EditableArea
  installs a command bus receiver in its iframe document and the
  fallback initial-insertion button declares an invoker command
  instead of a click listener
* Actions loses open-editor / select-tab-in-item-editor (editor-tree
  coordination is lifted into React state)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

# [4.0.0-alpha.70](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.69...v4.0.0-alpha.70) (2026-06-12)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.69](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.68...v4.0.0-alpha.69) (2026-06-12)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.68](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.67...v4.0.0-alpha.68) (2026-06-12)

### Features

- **core:** surface candidate selectors on NoEditableAreaError, export collector ([0088ad1](https://github.com/d-zero-dev/BurgerEditor/commit/0088ad1b4839d7585a15a190a9e3da86fa09f1cf))

# [4.0.0-alpha.67](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.66...v4.0.0-alpha.67) (2026-06-11)

### Bug Fixes

- **core:** strip block ids on duplicate, fail loudly when editableArea misses, fix SYSTEM doctype ([3fd5312](https://github.com/d-zero-dev/BurgerEditor/commit/3fd531202aa473d9cd05b41144de847717b9eba8))

### Features

- **core:** add block-ops, front matter, and html detection ([4893d02](https://github.com/d-zero-dev/BurgerEditor/commit/4893d023433ce8c8d0723cf4f6e49061376087ee))

# [4.0.0-alpha.66](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.65...v4.0.0-alpha.66) (2026-05-12)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.65](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.64...v4.0.0-alpha.65) (2026-04-08)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.64](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.63...v4.0.0-alpha.64) (2026-03-30)

### Bug Fixes

- **core:** fix ComponentObserver.off, EditorUI.visible, and onChange init ([0513e50](https://github.com/d-zero-dev/BurgerEditor/commit/0513e505603ed4a3f5837c8681e824105935ff00))

# [4.0.0-alpha.63](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.62...v4.0.0-alpha.63) (2026-03-10)

### Bug Fixes

- **core:** use cascade layer priority when merging nested default values in getCustomProperties ([3cb2133](https://github.com/d-zero-dev/BurgerEditor/commit/3cb2133579467d6a87f4829c29ad44a4e5253996))

# [4.0.0-alpha.62](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.61...v4.0.0-alpha.62) (2026-03-10)

### Bug Fixes

- **core:** exclude nested selectors from default value determination in getCustomProperties ([bbfa46a](https://github.com/d-zero-dev/BurgerEditor/commit/bbfa46acee859fcbca8e936ff55b92189ceff46d))
- **core:** fall back to nested defaults when no direct default exists ([8331a63](https://github.com/d-zero-dev/BurgerEditor/commit/8331a639f314c26bbd98df62421189d85dfece31))

# [4.0.0-alpha.61](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.60...v4.0.0-alpha.61) (2026-02-18)

### Bug Fixes

- **core:** migrate disable sentinel from null to empty value ([174edb1](https://github.com/d-zero-dev/BurgerEditor/commit/174edb1cce31d317f68d98d44102e0cce2b161c9))
- **core:** resolve CSS [@layer](https://github.com/layer) order globally across stylesheets ([b59b5a3](https://github.com/d-zero-dev/BurgerEditor/commit/b59b5a337265150a5c8a41ca7f4d226022fb84d1))

# [4.0.0-alpha.60](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.59...v4.0.0-alpha.60) (2026-02-16)

### Features

- **core:** add repeat-min-inline-size preset support for grid auto-fit/auto-fill ([0cef027](https://github.com/d-zero-dev/BurgerEditor/commit/0cef027c42388f584a4ad30b3a14b2103c49a2d7))

# [4.0.0-alpha.59](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.58...v4.0.0-alpha.59) (2026-02-12)

### Features

- **core:** add CSSScopeRule traversal support in getStyleRules ([250426e](https://github.com/d-zero-dev/BurgerEditor/commit/250426e6bfeda6d45b116e378c2e0600fa8bd57a))
- **core:** support :scope selector inside [@scope](https://github.com/scope) with matching root ([05ba726](https://github.com/d-zero-dev/BurgerEditor/commit/05ba7260b1e68118ea80cb856a21e803587b9776))

# [4.0.0-alpha.58](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.57...v4.0.0-alpha.58) (2026-02-05)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.57](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.56...v4.0.0-alpha.57) (2026-02-03)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.56](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.55...v4.0.0-alpha.56) (2026-01-23)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.55](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.54...v4.0.0-alpha.55) (2026-01-23)

### Features

- **core:** add experimental.itemOptions.wysiwyg.enableTextOnlyMode config option ([6202eb1](https://github.com/d-zero-dev/BurgerEditor/commit/6202eb1e6cbdbc10e216a5e8c1739672ff377689))

# [4.0.0-alpha.54](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.53...v4.0.0-alpha.54) (2026-01-22)

### Bug Fixes

- **core:** include generalCSS in WYSIWYG editor dialog stylesheet ([52f819e](https://github.com/d-zero-dev/BurgerEditor/commit/52f819e73bf194c66f46d44303d0ad2a737458d0))

# [4.0.0-alpha.53](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.52...v4.0.0-alpha.53) (2026-01-22)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.52](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.51...v4.0.0-alpha.52) (2026-01-21)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.51](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.50...v4.0.0-alpha.51) (2026-01-16)

### Features

- **core:** add linkarea option to container props ([e283d89](https://github.com/d-zero-dev/BurgerEditor/commit/e283d892956057a3f17c60e0975875eff6fdc7d2))

# [4.0.0-alpha.50](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.49...v4.0.0-alpha.50) (2026-01-15)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.49](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.48...v4.0.0-alpha.49) (2026-01-15)

### Features

- **core:** export exportStyleOptions function ([02ebc4c](https://github.com/d-zero-dev/BurgerEditor/commit/02ebc4c940382745be24c57e843778951da114cb))

# [4.0.0-alpha.48](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.47...v4.0.0-alpha.48) (2026-01-08)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.47](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.46...v4.0.0-alpha.47) (2026-01-06)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.46](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.45...v4.0.0-alpha.46) (2026-01-06)

**Note:** Version bump only for package @burger-editor/core

# [4.0.0-alpha.45](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.44...v4.0.0-alpha.45) (2025-12-26)

### Features

- **core:** add comparePriority utility function ([35f5689](https://github.com/d-zero-dev/BurgerEditor/commit/35f5689b1605433d4bfd3ef788ff06f169eb4576))
- **core:** add id parameter to stylesheet management ([678b012](https://github.com/d-zero-dev/BurgerEditor/commit/678b0121414bbd717a5edef13aa7e0252573d303))
- **core:** support CSS layer priority in custom property resolution ([69eb47c](https://github.com/d-zero-dev/BurgerEditor/commit/69eb47cd815edeb7f6a8b0425888c43f24614abb))

# [4.0.0-alpha.44](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.43...v4.0.0-alpha.44) (2025-12-25)

### Bug Fixes

- **core:** apply item initial values from catalog options ([f54500d](https://github.com/d-zero-dev/BurgerEditor/commit/f54500dcb166dde8e230615a271001ae5c20121f))

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
