# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [4.0.0-alpha.73](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.72...v4.0.0-alpha.73) (2026-09-18)

### Bug Fixes

- **client:** fix code-review findings for the single-root React refactor ([36e5d2c](https://github.com/d-zero-dev/BurgerEditor/commit/36e5d2cf965e1e4b91bacb1a6de4abe285a31119))
- **client:** restore querySelector generic dropped by pre-commit eslint --fix ([2192995](https://github.com/d-zero-dev/BurgerEditor/commit/21929954230f6f50ce500fcf121a55c5b0d07a08))

- fix(client)!: fix useExternalFileSelection's stale-closure eslint suppression ([f90ecfb](https://github.com/d-zero-dev/BurgerEditor/commit/f90ecfb4bb883c3d84dd8df173125c59a8b11571))
- feat(client)!: adopt React Compiler via @rolldown/plugin-babel ([570cb4a](https://github.com/d-zero-dev/BurgerEditor/commit/570cb4a1f32d34776a4205b9ffa7624f966f10f4))
- refactor(core,client,blocks)!: fix remaining render-purity issues ([39dd23e](https://github.com/d-zero-dev/BurgerEditor/commit/39dd23e7d16cfb52a6252d8659000f83d4972283))
- refactor(client)!: back FrontMatterEditor with a FrontMatterStore ([6875428](https://github.com/d-zero-dev/BurgerEditor/commit/68754285c7181c52a384b3145077381d8cc49f8e))
- refactor(client)!: move EditorDialog submission to a form action ([9d3f3c7](https://github.com/d-zero-dev/BurgerEditor/commit/9d3f3c7625a3cc24727c86abfbc8c9b39584cde7)), closes [facebook/react#34038](https://github.com/facebook/react/issues/34038)
- refactor(client)!: replace componentObserver with FileBrowserStore + use() ([adc7b3f](https://github.com/d-zero-dev/BurgerEditor/commit/adc7b3fe9578d0e6b400e87793cba37c60d40bad))
- refactor(core)!: drop componentObserver indirection for select-block ([b60f956](https://github.com/d-zero-dev/BurgerEditor/commit/b60f956e7c94a22579b7746b6b697e1fa9fbd288))
- refactor(client)!: rewrite useCommand as a ref callback, adopt useEffectEvent ([14975c6](https://github.com/d-zero-dev/BurgerEditor/commit/14975c6af4e0623d688aea8dc24ca7d6578c1782))
- refactor(client)!: collapse to one React root per engine, add EngineContext ([820e4e6](https://github.com/d-zero-dev/BurgerEditor/commit/820e4e63f4610f64e984011653aadf0403481b01))

### Features

- **client:** add describedBy to TextField for aria-describedby ([46c387a](https://github.com/d-zero-dev/BurgerEditor/commit/46c387a2546d189fd32a0cea7b736e6bbe1ef9c9))
- **client:** route command bus and dialog ids through the owning engine ([5261600](https://github.com/d-zero-dev/BurgerEditor/commit/5261600835f845fa8556827ec66bf7887bf1ce39))

### BREAKING CHANGES

- none to the public API; continues the prior React
  Compiler commits' build-tooling-only breaking-change flag.
- none to the public API; this is build-tooling only.
  Flagged as a breaking-adjacent commit because the compiler is now a
  mandatory part of the production build pipeline (opt out entirely
  via BGE_NO_COMPILER=1).
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

- FrontMatterEditorView's props change from
  `{initialData, onDataChange}` to `{store: FrontMatterStore}`.
  createFrontMatterEditor's own public options are unchanged.

createFrontMatterEditor previously held a plain `let latest` closure
variable, reassigned from inside the onDataChange callback passed to
<FrontMatterEditorView>, so the handle's synchronous getData() had a
value to read from outside React. That's the one spot in the client
package where React state was read through a side channel instead of a
proper subscription.

FrontMatterStore (subscribe/getSnapshot/setFields, the same shape as
the other stores from this pass) now owns the field list - the actual
data, as opposed to the view's own UI-only state (collapsed, add-
dialog-open, in-progress JSON drafts, which stay as plain useState).
createFrontMatterEditor constructs the store, subscribes to it once to
drive onUpdated, and the handle's getData()/getOriginalFrontMatter()
read straight from it - no closure variable, no React-side callback
needed to keep it current. FrontMatterEditorView reads the field list
via useSyncExternalStore instead of owning it as useState, and every
mutation (add/delete/edit a field) goes through store.setFields()
instead of a local setState + onDataChange(data) pair.

The existing front-matter-editor.spec.tsx (16 tests, covering
rendering, focus-preservation across a field list change, editing every
field type, add/delete, and the handle's getData/getOriginalFrontMatter)
needed no changes at all - it only ever exercised createFrontMatterEditor's
public contract, which is unchanged. That's the behavior-preservation
signal for this refactor. Added three more tests directly against
FrontMatterStore (getData reflects the constructor's initial data,
setFields notifies subscribers and updates getData/getSnapshot, and
unsubscribing stops only that one listener).

The storybook story rendered FrontMatterEditorView directly with the
old props, so it now constructs a FrontMatterStore from the story's
initialData arg (a local useState so each story instance gets its own).

Verified: full-repo yarn build and yarn lint clean; yarn test:unit
(host, Docker unavailable) 1522/1522 passing outside the VR project
(same pre-existing 24 pixel-size VR failures). Also verified in the
local CMS: edited the page title and added a new "author" field through
the real Front Matter panel, then confirmed via the Agent Hub
(front_matter_get) that both changes persisted to the page file, with
no new console errors.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>

- EditorDialog's `onComplete(formData)` prop is replaced
  by `action(formData)`. The form's `method="dialog"` attribute is gone -
  submission goes through `<form action={fn}>` (useActionState) instead
  of an onSubmit handler that called `e.preventDefault()` and forwarded
  a FormData built from the current target.

Why: `onComplete` never surfaced a failure - the only place item saves
could throw (item.import(), a custom toItemData()) was ItemEditorHost's
`void (async () => { await submitRef.current?.(); ... })()`, an
unhandled-rejection waiting to happen. Wrapping the action in
useActionState gives the dialog a place to catch that failure, show it
via role="alert", and keep the dialog open with the user's edits intact
(ItemEditorBody's fields are already fully controlled React state, so
they're unaffected by React's form-action auto-reset of uncontrolled
elements). The submit button is disabled and aria-busy while the action
is pending, sourced directly from useActionState's own pending flag
rather than a separate useFormStatus - the button lives in EditorDialog
itself, so there's no need to cross a component boundary for it.

Success is now the action's own responsibility: both call sites
(BlockOptions in burger-editor-root.tsx, ItemEditorHost) call
`engine.uiState.closeDialog()` + `engine.save()` directly at the end of
their action, rather than relying on the previous indirect path (call
closeDialog() -> open becomes false -> the effect calls dialog.close()
-> the native close event fires -> onClose does the save). The cancel/
Escape/backdrop path is untouched - it still goes through `onClose`,
which still does the same closeDialog()+save(). The native close event
handler now guards `e.target === e.currentTarget`, since React has a
known issue where non-bubbling native events like `close` can appear to

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

- useCommand now returns a RefCallback<T> instead of a
  RefObject<T | null>. All call sites already did ref={rootRef} directly
  (no .current access elsewhere), so this is a drop-in replacement at
  every existing call site (Tabs, FileUploader, TableEditor, BlockMenu,
  FileList, FrontMatterEditorView, google-maps's Editor) -
  BlockMenuView's rootRef prop type moves from
  RefObject<HTMLDivElement | null> to Ref<HTMLDivElement> to match.

The previous implementation read ref.current once, inside a
useEffect(..., []) - if the receiving element only appears later from
a conditional render, the command listener would never attach. The
ref callback attaches whenever the element (re)mounts. Handlers are
read through useEffectEvent (stable in 19.2) instead of the old
handlersRef plus a deps-less useEffect that copied handlers into it
every render.

Also converts the remaining "latest ref" idioms that are eligible
(the ref is only ever read from a callback registered inside a
useEffect, i.e. genuinely reacting to an external system) to
useEffectEvent:

- useComponentEvent (use-engine.ts): the componentObserver.on
  subscription callback.
- EditableAreaView: the source-mode exit effect's read of the
  textarea's pending value (getPendingSourceText), replacing
  sourceTextRef and its own sync effect.
- WysiwygField: the custom element's transaction event listener.
- ItemEditorHost/ItemEditorBody: the submit closure's read of the
  latest editor state (resolveSubmitData), replacing stateRef.

Left blocks/items/image/editor.tsx's stateRef as-is: fileSelect/
selectTab are called both from a mount effect and from Tabs's
onChange prop (a plain callback, not an effect subscription), so
useEffectEvent - whose contract restricts calls to effects or other
effect events - doesn't apply there without a larger restructuring.

Verified: full-repo yarn build and yarn lint clean; yarn test:unit
(host, Docker unavailable) 1507/1507 passing outside the VR project
(same pre-existing 24 pixel-size VR failures, unrelated). Also
manually verified in a real browser: opened the image item editor and
switched tabs via the rewritten useCommand/Tabs, no console errors.

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

- **client:** fix item-editor-host.spec.ts CI build failure ([64904fc](https://github.com/d-zero-dev/BurgerEditor/commit/64904fc53353cdd0bafc765fa7b8f804d7fbb798))
- **client:** fix this-binding in reactMount()'s deprecated cleanUp() alias ([800b97d](https://github.com/d-zero-dev/BurgerEditor/commit/800b97db2a0b2808a1c6854e5d01600e5e872fd3))
- **client:** guard content-stylesheet injection against disposed wysiwyg ([fa2a835](https://github.com/d-zero-dev/BurgerEditor/commit/fa2a835a898ae46363d7261c79c49fa90316ba04))
- **client:** pin block-menu layer to iframe viewport top-left ([13d7742](https://github.com/d-zero-dev/BurgerEditor/commit/13d7742ae14a01fcdda003c25636cbfe038bb410))
- **client:** rebind blocks when leaving source mode ([7d2d84e](https://github.com/d-zero-dev/BurgerEditor/commit/7d2d84e4111df8bd018c5b95dae8771d784e3e2b)), closes [#901](https://github.com/d-zero-dev/BurgerEditor/issues/901)
- **client:** restore EditableAreaView export dropped during commit split ([42b145b](https://github.com/d-zero-dev/BurgerEditor/commit/42b145b2c1be18c68eaefd2141bbbacc949c0fe7))
- **client:** use mockImplementation for void promise mocks in tests ([0ab0d8e](https://github.com/d-zero-dev/BurgerEditor/commit/0ab0d8e5c169622c6d15f293e56d73e5653e0e5b))

### Features

- **client:** fix isProcessed leak in move/remove-block and dialogHost leak ([910b581](https://github.com/d-zero-dev/BurgerEditor/commit/910b581595c6105441c3ccc58c204542776f16a2))
- **client:** inject the [data-bge-highlight] blink animation into editable-area iframes ([673b179](https://github.com/d-zero-dev/BurgerEditor/commit/673b1795b6bd363baaf4b19ca775b53250ed9ed6))

# [4.0.0-alpha.71](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.70...v4.0.0-alpha.71) (2026-08-11)

### Bug Fixes

- **client:** avoid cascading renders in the preview dimension reset ([05e3e89](https://github.com/d-zero-dev/BurgerEditor/commit/05e3e899f31895eeeb7c8892120d6bf8fa09be69))
- **client:** close code-review findings in the view port implementation ([26aaa78](https://github.com/d-zero-dev/BurgerEditor/commit/26aaa78af44c9321b6fa70ff6730ed99c3e33cda))
- **client:** close review gaps in dialogs, commands and file list ([d4abeb0](https://github.com/d-zero-dev/BurgerEditor/commit/d4abeb0ffa07d1e2dc2e935a5e4d4be5706512f2))
- **client:** drive blockMenu visibility through React state only ([fe9ef12](https://github.com/d-zero-dev/BurgerEditor/commit/fe9ef124bd0a27fa2a9e77360aeadb880353640e))
- **client:** keep block-menu buttons clickable above the item-edit overlay ([6440e1d](https://github.com/d-zero-dev/BurgerEditor/commit/6440e1d5e78e59c3e35c3dd7066a1a647f094dc6))
- **client:** only render item overlays for elements that resolve to an Item ([229092c](https://github.com/d-zero-dev/BurgerEditor/commit/229092c7fbf352342c8b7794f7ecf6af1b13523b))
- **client:** remove direct DOM manipulation left over from the React overhaul ([5defbfa](https://github.com/d-zero-dev/BurgerEditor/commit/5defbfac211879c3c0b9d69751bbe09076d367d5))
- **client:** restore the global --border-radius token lost in the Svelte port ([b5d7b29](https://github.com/d-zero-dev/BurgerEditor/commit/b5d7b29b6fda2c3594d9b3b7577107fa88055416))
- **client:** snapshot the target block into the block-options dialog state ([a7059fb](https://github.com/d-zero-dev/BurgerEditor/commit/a7059fb18f6f935e8b409b5244f0b82645e7eca4))
- **client:** stop bundling React and fix the item-edit overlay on rebound blocks ([44a845d](https://github.com/d-zero-dev/BurgerEditor/commit/44a845d3e6b57bdd17707bc498e63675bf66bffc))
- **client:** surface file delete and upload failures ([67ed27e](https://github.com/d-zero-dev/BurgerEditor/commit/67ed27ea062d111ce138948215b0fb97965acf2b))
- **client:** use span-based figure markup in block catalog buttons ([8fc45e1](https://github.com/d-zero-dev/BurgerEditor/commit/8fc45e1676239d0b4c44ad538288cfb593332709))

- refactor(core)!: replace the three UI factory contracts with a single view port ([0e5b526](https://github.com/d-zero-dev/BurgerEditor/commit/0e5b526a3f694fe15051756b70a5e7c7a5feea77))
- refactor(client)!: flatten src/react into src and rename the subpath to ./ui ([5086a1a](https://github.com/d-zero-dev/BurgerEditor/commit/5086a1a5a369aef22cdd6f5c2d976f5bf2336bef))
- feat(client)!: replace Svelte with the React editor chrome ([cfd5c91](https://github.com/d-zero-dev/BurgerEditor/commit/cfd5c91c67f7543ba8299ed8f36dc48201e8daa2))

### Features

- **client:** add React UI foundation ([aa1e2da](https://github.com/d-zero-dev/BurgerEditor/commit/aa1e2dafc2928090d10afe6e0e855768955026b7))
- **client:** add WysiwygField and export invoker command attributes type ([fb963ad](https://github.com/d-zero-dev/BurgerEditor/commit/fb963adc4f60e8f7611ac1939faac2f28711fd3d))
- **client:** export ItemEditorHost from the ui entry ([e143bfa](https://github.com/d-zero-dev/BurgerEditor/commit/e143bfa80806b6d386f6170f027ebeff3f67734c))
- **client:** reimplement the 12 UI components in React ([e5ee61e](https://github.com/d-zero-dev/BurgerEditor/commit/e5ee61ebc677203bd173aa208e2ddc41301b8aa0))
- **frozen-patty:** expose parse-fields as a subpath export ([d86d904](https://github.com/d-zero-dev/BurgerEditor/commit/d86d90403af844715119bb2ff84c5313a52f3f42))

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

- the Svelte 5 implementation is removed (12 components,
  svelte-mount, engine-state) together with the svelte toolchain
  (svelte, @tabler/icons-svelte, @sveltejs/vite-plugin-svelte,
  svelte-check). The entry mounts React roots instead:

* createBurgerEditorClient registers the central command dispatch
  table and mounts BurgerEditorRoot, which renders the catalog/
  options/item-editor dialogs declaratively from engine.uiState
* ItemEditorHost renders each item's Editor component with state from
  toEditorState and imports the result of toItemData on submit; it
  also injects the content stylesheet into embedded wysiwyg editors
* BlockMenu gains transparent per-item overlay buttons
  (--open-item-editor) replacing the direct click listener on content
  elements — the overlay lives outside the content container so saved
  HTML stays clean
* type checking is plain tsc (tsconfig.check.json); the temporary
  svelte-check split is gone
* specs for the removed class-based dialogs are deleted; React
  equivalents land with the test migration

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

# [4.0.0-alpha.70](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.69...v4.0.0-alpha.70) (2026-06-12)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.69](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.68...v4.0.0-alpha.69) (2026-06-12)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.68](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.67...v4.0.0-alpha.68) (2026-06-12)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.67](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.66...v4.0.0-alpha.67) (2026-06-11)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.66](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.65...v4.0.0-alpha.66) (2026-05-12)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.65](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.64...v4.0.0-alpha.65) (2026-04-08)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.64](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.63...v4.0.0-alpha.64) (2026-03-30)

### Bug Fixes

- **client:** exclude VR test directory from build dts generation ([e006695](https://github.com/d-zero-dev/BurgerEditor/commit/e006695c6448091ceb0b9b6fa5e1d8992068d550))
- **client:** exclude VR test directory from svelte-check ([bc0b1b9](https://github.com/d-zero-dev/BurgerEditor/commit/bc0b1b9f6bbc265c21dfeace4352c8828ccd1c5b))

# [4.0.0-alpha.63](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.62...v4.0.0-alpha.63) (2026-03-10)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.62](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.61...v4.0.0-alpha.62) (2026-03-10)

### Bug Fixes

- **client:** resolve BlockMenu crash when engine.content is not yet initialized ([0a3957f](https://github.com/d-zero-dev/BurgerEditor/commit/0a3957f0bf91c73de46de2b90e262fa45ba41f20))

### Features

- **client:** add EngineState bridge for ComponentObserver reactivity ([cfdf25f](https://github.com/d-zero-dev/BurgerEditor/commit/cfdf25fb8e606008ae0cbe13c08ed5e4670527a9))

# [4.0.0-alpha.61](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.60...v4.0.0-alpha.61) (2026-02-18)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.60](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.59...v4.0.0-alpha.60) (2026-02-16)

### Features

- **client:** add repeat-min-inline-size preset selector to block options UI ([a60077a](https://github.com/d-zero-dev/BurgerEditor/commit/a60077a29d20bc8819559eca73b9686d114a1cf6))

# [4.0.0-alpha.59](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.58...v4.0.0-alpha.59) (2026-02-12)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.58](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.57...v4.0.0-alpha.58) (2026-02-05)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.57](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.56...v4.0.0-alpha.57) (2026-02-03)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.56](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.55...v4.0.0-alpha.56) (2026-01-23)

### Features

- **client:** add container query support to fieldset elements ([acbe312](https://github.com/d-zero-dev/BurgerEditor/commit/acbe312865289e725e541698a452a9e7f73e9322))

# [4.0.0-alpha.55](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.54...v4.0.0-alpha.55) (2026-01-23)

### Bug Fixes

- **client:** adjust select element padding for experimental mode selector ([a86bf75](https://github.com/d-zero-dev/BurgerEditor/commit/a86bf75a7ca1d47ebc825b95e2c3cfa35d86bf04))

### Features

- **client:** pass experimental.itemOptions.wysiwyg.enableTextOnlyMode to custom element ([1101db6](https://github.com/d-zero-dev/BurgerEditor/commit/1101db656215c37e873b8af1e14140021d5a2451))

# [4.0.0-alpha.54](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.53...v4.0.0-alpha.54) (2026-01-22)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.53](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.52...v4.0.0-alpha.53) (2026-01-22)

### Features

- **client:** add paste functionality to block catalog dialog ([3512478](https://github.com/d-zero-dev/BurgerEditor/commit/35124780830703e462c203c6c401db492f46a1ae))

# [4.0.0-alpha.52](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.51...v4.0.0-alpha.52) (2026-01-21)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.51](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.50...v4.0.0-alpha.51) (2026-01-16)

### Features

- **client:** add linkarea checkbox to block options ([c6ee2ee](https://github.com/d-zero-dev/BurgerEditor/commit/c6ee2ee23bb7c81a6285c5ade863925038e437ee))

# [4.0.0-alpha.50](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.49...v4.0.0-alpha.50) (2026-01-15)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.49](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.48...v4.0.0-alpha.49) (2026-01-15)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.48](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.47...v4.0.0-alpha.48) (2026-01-08)

### Bug Fixes

- **client:** fix style extension select showing wrong value when before default ([700eae2](https://github.com/d-zero-dev/BurgerEditor/commit/700eae280d1709c005368c3b67376dae96c83993))

# [4.0.0-alpha.47](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.46...v4.0.0-alpha.47) (2026-01-06)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.46](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.45...v4.0.0-alpha.46) (2026-01-06)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.45](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.44...v4.0.0-alpha.45) (2025-12-26)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.44](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.43...v4.0.0-alpha.44) (2025-12-25)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.43](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.42...v4.0.0-alpha.43) (2025-12-24)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.42](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.41...v4.0.0-alpha.42) (2025-12-11)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.34](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.33...v4.0.0-alpha.34) (2025-12-01)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.33](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.32...v4.0.0-alpha.33) (2025-12-01)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.32](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.31...v4.0.0-alpha.32) (2025-12-01)

### Bug Fixes

- **client:** set width for number input in label-output span ([0a6e626](https://github.com/d-zero-dev/BurgerEditor/commit/0a6e626534161287fe48b566070a94abf0d23c5c))

# [4.0.0-alpha.31](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.30...v4.0.0-alpha.31) (2025-11-26)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.30](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.29...v4.0.0-alpha.30) (2025-11-13)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.29](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.28...v4.0.0-alpha.29) (2025-10-22)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.28](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.27...v4.0.0-alpha.28) (2025-10-22)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.27](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.26...v4.0.0-alpha.27) (2025-10-08)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.26](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.25...v4.0.0-alpha.26) (2025-10-08)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.25](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.24...v4.0.0-alpha.25) (2025-09-19)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.24](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.23...v4.0.0-alpha.24) (2025-09-19)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.23](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.22...v4.0.0-alpha.23) (2025-09-19)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.22](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.21...v4.0.0-alpha.22) (2025-09-19)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.21](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.20...v4.0.0-alpha.21) (2025-09-19)

### Bug Fixes

- **client:** pass engine parameter to updateGridItems ([f821e3c](https://github.com/d-zero-dev/BurgerEditor/commit/f821e3ccf4ff5abd960d5f8ff009cf90ebf5a941))
- **client:** preserve element styles during replace animation ([c489d73](https://github.com/d-zero-dev/BurgerEditor/commit/c489d731ec3f0f0105df004df2f0e3631b5a4569))

# [4.0.0-alpha.20](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.19...v4.0.0-alpha.20) (2025-09-11)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.19](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.18...v4.0.0-alpha.19) (2025-09-11)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.18](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.17...v4.0.0-alpha.18) (2025-09-11)

### Bug Fixes

- **client:** exclude float container type from semantic frame selection ([11f3eee](https://github.com/d-zero-dev/BurgerEditor/commit/11f3eee5ebeda27d02f376b377e8111428368c2b))

### Features

- **client,blocks:** add semantic container frame UI and styles ([f8a10d4](https://github.com/d-zero-dev/BurgerEditor/commit/f8a10d4902c5895cd07de5d2461039e20bb0f34f))
- **client,core:** add container type selection to block options ([2f766f6](https://github.com/d-zero-dev/BurgerEditor/commit/2f766f6038dfd431edc8aafc9fc6df95ed6bd302))
- **client:** hide inline layout options for immutable single-item blocks ([de71f00](https://github.com/d-zero-dev/BurgerEditor/commit/de71f00937da23834c039c8f8111d3ffda9c5307))
- **client:** update UI to select box for autoRepeat options ([768de75](https://github.com/d-zero-dev/BurgerEditor/commit/768de758dce03339c618da5fa2bad6c5b2944b26))

# [4.0.0-alpha.17](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.16...v4.0.0-alpha.17) (2025-08-25)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.16](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.15...v4.0.0-alpha.16) (2025-08-22)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.15](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.14...v4.0.0-alpha.15) (2025-08-22)

### Features

- **client:** update block options to match new specs ([097a505](https://github.com/d-zero-dev/BurgerEditor/commit/097a505bc6057f58582eca7628a3ec2850cc8a89))

# [4.0.0-alpha.14](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.13...v4.0.0-alpha.14) (2025-08-14)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.13](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.12...v4.0.0-alpha.13) (2025-08-13)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.12](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.11...v4.0.0-alpha.12) (2025-08-08)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.11](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.10...v4.0.0-alpha.11) (2025-08-01)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.10](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.9...v4.0.0-alpha.10) (2025-08-01)

### Bug Fixes

- **client:** adjust font size in UI styles ([7976056](https://github.com/d-zero-dev/BurgerEditor/commit/7976056f40ac058ba9d264bb90ddf47c2e06761f))
- **client:** correct tab border radius properties ([7b4dab0](https://github.com/d-zero-dev/BurgerEditor/commit/7b4dab067c46317d1f1762f0c1f33c29a664995b))
- **client:** validate page number in paginate function ([bc050dc](https://github.com/d-zero-dev/BurgerEditor/commit/bc050dcb645292c2740fc00d102bc9ea54aa48de))

### Features

- **client:** improve wysiwyg editor spacing and configure stylelint for custom elements ([ff47f4b](https://github.com/d-zero-dev/BurgerEditor/commit/ff47f4b08a0b36cc13559761bfbd7ecbe0e8a531))
- **core:** add auto-fit grid layout functionality ([09afd9f](https://github.com/d-zero-dev/BurgerEditor/commit/09afd9f8cdd548f00532b79776b104e2b6ddb1ce))

# [4.0.0-alpha.9](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.8...v4.0.0-alpha.9) (2025-07-11)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.8](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.7...v4.0.0-alpha.8) (2025-07-11)

### Bug Fixes

- **client:** change outline display condition to hover only ([4f82950](https://github.com/d-zero-dev/BurgerEditor/commit/4f82950ff0761b5c7bdaaa93c217ab42c511468f))

### Features

- **blocks:** migrate wysiwyg editor from trix to lexical ([9bf448b](https://github.com/d-zero-dev/BurgerEditor/commit/9bf448bd6e341db08d257fef8315f057699e5637))

# [4.0.0-alpha.7](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.6...v4.0.0-alpha.7) (2025-07-03)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.6](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.5...v4.0.0-alpha.6) (2025-06-26)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.5](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.4...v4.0.0-alpha.5) (2025-06-26)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.4](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.3...v4.0.0-alpha.4) (2025-04-07)

### Features

- **client:** add tabs UI ([8518ed2](https://github.com/d-zero-dev/BurgerEditor/commit/8518ed2cf1ef2e6201d28a19cc71128c7edfbdfd))

# [4.0.0-alpha.3](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.2...v4.0.0-alpha.3) (2025-04-03)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.2](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.1...v4.0.0-alpha.2) (2025-04-03)

**Note:** Version bump only for package @burger-editor/client

# [4.0.0-alpha.1](https://github.com/d-zero-dev/BurgerEditor/compare/v0.10.0...v4.0.0-alpha.1) (2025-04-03)

### Features

- **repo:** create v4 ([1efcf18](https://github.com/d-zero-dev/BurgerEditor/commit/1efcf18e2f59567a87c5589ae057195c31dbc0e8))

### BREAKING CHANGES

- **repo:** created v4
