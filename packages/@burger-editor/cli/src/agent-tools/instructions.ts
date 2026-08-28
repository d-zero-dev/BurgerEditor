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
2. Address a block by target: { index } (position, shifts on insert/delete)
   or { id } (stable — use block_ensure_id first if the block has none).
3. Every mutation on an existing page (block_*, item_update, page_update,
   front_matter_set, page_delete, page_rename, page_copy, and page_concat's
   sources/existing "to") requires the readToken from your last read of
   that exact page. A missing or outdated token fails with read-required or
   stale — both responses include a fresh readToken and a currentBlocks
   peek so you can retry immediately without another full read.
4. dryRun is a neutral tool, not a required first step: pass dryRun: true on
   any mutation to get a diff back without writing, when you want to show
   the user a change before it lands. There is no expectation that you do
   this by default.
5. The project's documentRoot is expected to be under git. Undo is the
   user's job via git — do not run git checkout, git restore, git reset, or
   any other git command that discards changes. Apply mutations directly;
   you do not need to ask for confirmation before writing.
6. appliedTo on a mutation's result ("browser" or "disk") is informational.
   Do not change your behavior based on it — the contract is identical
   either way.
7. If a tool errors with local-unreachable or local-required, that means
   the local dev server (\`npx bge\`) is not running. Report it to the user
   as informational; do not attempt to start it yourself.
`.trim();
