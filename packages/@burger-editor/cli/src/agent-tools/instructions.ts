/**
 * Loaded into `ServerOptions.instructions` by the MCP server (and available
 * to any other client that reads `GET /api/agent/tools`), this is the one
 * place written for the AGENT to read, as opposed to `AgentTool.description`
 * (read per-call, kept to 3 lines) or JSDoc (read by humans maintaining this
 * code, never sent to a model). It states the working procedure and the two
 * standing policies (git-based undo, neutral dryRun) that a tool description
 * has no room to restate on every call — see the design-rationale JSDoc on
 * `read-token.ts`, `errors.ts`, and `mcp-server/src/router.ts` for WHY each
 * of these choices was made, not just what they are.
 */
export const agentInstructions = `
BurgerEditor Agent Hub — working procedure

1. Read before you write. Call page_blocks({ path }) to get a block count
   and a readToken; call it again with that readToken to receive the full
   block list (text, headings, item names — not full HTML). Pick a target
   by reading that list yourself; there is no separate search tool.
2. Before constructing a block_insert / block_replace / page_create spec,
   call catalog_list to see what's available in this project, then
   catalog_get({ name }) for a ready-to-insert template of an existing
   catalog block, or item_schema({ name }) for a raw item's dataKeys when
   you're composing items yourself instead of using a catalog entry. Do not
   guess an item's name or its data fields from a block's rendered text —
   the same visible text can be backed by different item types with
   different data shapes across projects.
3. Address a block by target: { index } (position, shifts on insert/delete)
   or { id } (stable — use block_ensure_id first if the block has none).
4. Every mutation on an existing page (block_*, item_update, page_update,
   front_matter_set, page_delete, page_rename, page_copy, and page_concat's
   sources/existing "to") requires the readToken from your last read of
   that exact page. A missing or outdated token fails with read-required or
   stale — both responses include a fresh readToken and a currentBlocks
   peek so you can retry immediately without another full read.
5. dryRun is a neutral tool, not a required first step: pass dryRun: true on
   any mutation to get a diff back without writing, when you want to show
   the user a change before it lands. There is no expectation that you do
   this by default.
6. The project's documentRoot is expected to be under git. Undo is the
   user's job via git — do not run git checkout, git restore, git reset, or
   any other git command that discards changes. Apply mutations directly;
   you do not need to ask for confirmation before writing.
7. appliedTo on a mutation's result ("browser" or "disk") is informational.
   Do not change your behavior based on it — the contract is identical
   either way.
8. If a mutation is relayed to a browser tab and a human is using it (a
   dialog is open, or they're in source mode), it fails with user-editing
   instead of applying. Wait for editor_wait_for_event({ types: ['ui-idle']
   }) and retry — do not treat this as a hard failure.
9. If a tool errors with local-unreachable or local-required, that means
   the local dev server (\`bge\`, from \`@burger-editor/local\`) is not
   running. Report it to the user as informational; do not attempt to start
   it yourself.
`.trim();
