// Spread into every command below: roar has no program-wide flags, and every
// command needs a context, so each one accepts `--config` on its own.
export const CONFIG_FLAG = {
	config: {
		type: 'string',
		desc: 'Config file to use instead of searching for burgereditor.config.* (or set BGE_CONFIG)',
	},
} as const;

// IMPORTANT — flag keys MUST be camelCase. roar derives the user-facing
// `--kebab-case` form automatically; if you define `'spec-file'` literally
// here, roar silently drops the flag entirely. (See @d-zero/roar's
// camelCase→kebab-case conversion contract.)
//
// Positional argument hints live in the `desc` string (roar's help generator
// doesn't carry positional info separately). Keep the `<usage>` suffix
// consistent so `<package-cli> <cmd> --help` reads like the project README.
export const commands = {
	'page-list': {
		desc: 'List pages under documentRoot, plus invalidPages (resolver-skipped files)',
		flags: { ...CONFIG_FLAG },
	},
	'page-get': {
		desc: 'Get raw page content + front matter — usage: page-get <path>',
		flags: { ...CONFIG_FLAG },
	},
	'page-create': {
		desc: 'Create a new page (optional initial blocks via --spec*) — usage: page-create <path>',
		flags: {
			...CONFIG_FLAG,
			spec: { type: 'string', desc: 'Inline JSON spec' },
			specFile: { type: 'string', desc: 'Path to a JSON spec file' },
		},
	},
	'page-delete': {
		desc: 'Delete a page file — usage: page-delete <path>',
		flags: { ...CONFIG_FLAG },
	},
	'page-rename': {
		desc: 'Rename / move a page file — usage: page-rename <from> <to>',
		flags: { ...CONFIG_FLAG },
	},
	'page-copy': {
		desc: 'Copy a page file — usage: page-copy <from> <to>',
		flags: { ...CONFIG_FLAG },
	},
	'page-concat': {
		desc: 'Append editable content of sources onto target — usage: page-concat <target> <source...>',
		flags: { ...CONFIG_FLAG },
	},
	'front-matter-get': {
		desc: 'Get a page front matter — usage: front-matter-get <path>',
		flags: { ...CONFIG_FLAG },
	},
	'front-matter-set': {
		desc: 'Set a page front matter (merge by default; --replace to overwrite) — usage: front-matter-set <path>',
		flags: {
			...CONFIG_FLAG,
			spec: { type: 'string', desc: 'Inline JSON object' },
			specFile: { type: 'string', desc: 'Path to JSON file' },
			replace: {
				type: 'boolean',
				desc: 'Replace front matter entirely instead of merging',
			},
		},
	},
	'page-blocks': {
		desc: 'List every block in a page (id/text/headings summary) — usage: page-blocks <path>',
		flags: { ...CONFIG_FLAG },
	},
	'block-get': {
		desc: 'Get a single block by index — usage: block-get <path> <index>',
		flags: { ...CONFIG_FLAG },
	},
	'block-insert': {
		desc: 'Insert a block at index — usage: block-insert <path> <atIndex>',
		flags: {
			...CONFIG_FLAG,
			spec: { type: 'string', desc: 'Inline JSON block spec' },
			specFile: { type: 'string', desc: 'Path to JSON block spec' },
			dryRun: {
				type: 'boolean',
				desc: 'Compute the would-be HTML but do not write — returns previewContent',
			},
		},
	},
	'block-replace': {
		desc: 'Replace a block at index — usage: block-replace <path> <index>',
		flags: {
			...CONFIG_FLAG,
			spec: { type: 'string', desc: 'Inline JSON block spec' },
			specFile: { type: 'string', desc: 'Path to JSON block spec' },
			dryRun: { type: 'boolean', desc: 'Compute the would-be HTML but do not write' },
		},
	},
	'block-delete': {
		desc: 'Delete a block at index — usage: block-delete <path> <index>',
		flags: {
			...CONFIG_FLAG,
			dryRun: { type: 'boolean', desc: 'Compute the would-be HTML but do not write' },
		},
	},
	'block-move': {
		desc: 'Move a block — usage: block-move <path> <from> <to> (to = destination in FINAL list, splice convention)',
		flags: {
			...CONFIG_FLAG,
			dryRun: { type: 'boolean', desc: 'Compute the would-be HTML but do not write' },
		},
	},
	'block-duplicate': {
		desc: 'Duplicate a block right after itself — usage: block-duplicate <path> <index>',
		flags: {
			...CONFIG_FLAG,
			dryRun: { type: 'boolean', desc: 'Compute the would-be HTML but do not write' },
		},
	},
	'block-ensure-id': {
		desc: 'Assign a stable bge-<n> id to a block that has none (idempotent) — usage: block-ensure-id <path> <index>',
		flags: { ...CONFIG_FLAG },
	},
	'item-update': {
		desc: 'Merge new data into one item within a block — usage: item-update <path> <blockIndex> <itemIndex>',
		flags: {
			...CONFIG_FLAG,
			spec: { type: 'string', desc: 'Inline JSON data patch' },
			specFile: { type: 'string', desc: 'Path to JSON data patch' },
			dryRun: { type: 'boolean', desc: 'Compute the would-be HTML but do not write' },
		},
	},
	'catalog-list': {
		desc: 'List catalog block definitions available in this project',
		flags: { ...CONFIG_FLAG },
	},
	'catalog-get': {
		desc: 'Get a single catalog block definition (with ready-to-insert template) — usage: catalog-get <name>',
		flags: { ...CONFIG_FLAG },
	},
	'item-list': { desc: 'List item names', flags: { ...CONFIG_FLAG } },
	'item-schema': {
		desc: 'Get item editor template + camelCase dataKeys — usage: item-schema <name>',
		flags: { ...CONFIG_FLAG },
	},
	'style-options-list': {
		desc: 'List CSS bge-options custom property axes found in project stylesheets',
		flags: { ...CONFIG_FLAG },
	},
	'container-options-list': {
		desc: 'List container layout option values (static)',
		flags: { ...CONFIG_FLAG },
	},
	'config-resolve': {
		desc: 'Resolve and print the active burgereditor config summary',
		flags: { ...CONFIG_FLAG },
	},
} as const;
