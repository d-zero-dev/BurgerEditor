# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [4.0.0-alpha.73](https://github.com/d-zero-dev/BurgerEditor/compare/v4.0.0-alpha.72...v4.0.0-alpha.73) (2026-09-18)

- refactor(client)!: back FrontMatterEditor with a FrontMatterStore ([6875428](https://github.com/d-zero-dev/BurgerEditor/commit/68754285c7181c52a384b3145077381d8cc49f8e))
- refactor(client)!: replace componentObserver with FileBrowserStore + use() ([adc7b3f](https://github.com/d-zero-dev/BurgerEditor/commit/adc7b3fe9578d0e6b400e87793cba37c60d40bad))
- refactor(client)!: collapse to one React root per engine, add EngineContext ([820e4e6](https://github.com/d-zero-dev/BurgerEditor/commit/820e4e63f4610f64e984011653aadf0403481b01))

### BREAKING CHANGES

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

- **repo:** render dialog/block-menu context around form-like components ([45fe99e](https://github.com/d-zero-dev/BurgerEditor/commit/45fe99e2c4f53f56b4d51bb36cc44143796c65aa))
- **repo:** replace dead example.com image URLs with a real placeholder ([302d235](https://github.com/d-zero-dev/BurgerEditor/commit/302d235f56a3be21a156addaa7220d241899921c))

### Features

- **repo:** add Storybook catalog for admin UI components ([571f5d1](https://github.com/d-zero-dev/BurgerEditor/commit/571f5d16024ea2f6eb87919dc08d9336cbdf74d8))
- **storybook:** add an EditableAreaView story to demo BurgerBlock.highlight() ([4f30bc2](https://github.com/d-zero-dev/BurgerEditor/commit/4f30bc23cedf93d0ad6aac680f20728cc591cf3c))
