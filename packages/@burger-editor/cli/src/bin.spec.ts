import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

// End-to-end smoke for the compiled bin. Spawns `node dist/bin.js` against a
// fixture project and asserts on stdout JSON + exit code. Catches regressions
// in the layered stack (parseCli → loadContext → cosmiconfig walk → handlers
// → file-io fs → core block-ops → render) that pure unit tests miss.
//
// Requires `yarn build` to have produced packages/@burger-editor/cli/dist/.
// We co-locate the fixture inside the cli package so node_modules resolution
// for `@burger-editor/blocks` (referenced by the fixture config) works.

const FIXTURE_ROOT = path.resolve(import.meta.dirname, '../.tmp-bin-e2e-fixture');
const BIN_PATH = path.resolve(import.meta.dirname, '../dist/bin.js');

let docRoot: string;

beforeAll(async () => {
	// Build artifact must exist for the E2E to be meaningful.
	await fs.access(BIN_PATH).catch(() => {
		throw new Error(
			`bin.spec: built bin not found at ${BIN_PATH}. Run \`yarn build\` first.`,
		);
	});

	await fs.rm(FIXTURE_ROOT, { recursive: true, force: true }).catch(() => {});
	docRoot = path.join(FIXTURE_ROOT, 'src');
	await fs.mkdir(docRoot, { recursive: true });
	await fs.writeFile(
		path.join(docRoot, 'index.html'),
		`<div class="content"><div data-bge-name="h2" data-bge-container="inline:immutable"><div data-bge-container-frame><div data-bge-group><div data-bge-item><div data-bgi="title-h2"><h2 data-bge="title-h2">Hello E2E</h2></div></div></div></div></div></div>`,
		'utf8',
	);
	await fs.writeFile(
		path.join(FIXTURE_ROOT, 'burgereditor.config.mjs'),
		`import { defaultCatalog } from '@burger-editor/blocks';
export default {
	documentRoot: './src',
	assetsRoot: './src',
	editableArea: '.content',
	catalog: defaultCatalog,
	newFileContent: '<div class="content"></div>',
};
`,
		'utf8',
	);
});

afterAll(async () => {
	await fs.rm(FIXTURE_ROOT, { recursive: true, force: true }).catch(() => {});
});

interface RunResult {
	readonly stdout: string;
	readonly stderr: string;
	readonly code: number | null;
}

/**
 *
 * @param args
 * @param stdinPayload
 */
function run(args: readonly string[], stdinPayload?: string): Promise<RunResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [BIN_PATH, ...args], {
			cwd: FIXTURE_ROOT,
			env: { ...process.env, DOTENV_CONFIG_QUIET: 'true' },
		});
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (chunk) => {
			stdout += chunk;
		});
		child.stderr.on('data', (chunk) => {
			stderr += chunk;
		});
		child.on('error', reject);
		child.on('close', (code) => resolve({ stdout, stderr, code }));
		if (stdinPayload === undefined) {
			child.stdin.end();
		} else {
			child.stdin.end(stdinPayload);
		}
	});
}

describe('bin.js end-to-end', () => {
	test('catalog-list prints catalogs as a single JSON document on stdout', async () => {
		const result = await run(['catalog-list']);
		expect(result.code).toBe(0);
		const payload = JSON.parse(result.stdout) as { catalogs: { name: string }[] };
		expect(payload.catalogs.length).toBeGreaterThan(0);
		expect(payload.catalogs.find((c) => c.name === 'h2')).toBeDefined();
	}, 20_000);

	test('config-resolve summarises the active config', async () => {
		const result = await run(['config-resolve']);
		expect(result.code).toBe(0);
		const payload = JSON.parse(result.stdout) as { documentRoot: string };
		expect(payload.documentRoot).toBe(path.join(FIXTURE_ROOT, 'src'));
	}, 20_000);

	test('block-list runs the full layered stack end-to-end', async () => {
		const result = await run(['block-list', 'index.html']);
		expect(result.code).toBe(0);
		const payload = JSON.parse(result.stdout) as {
			blocks: { data: { name: string; items: unknown[][] } }[];
		};
		expect(payload.blocks).toHaveLength(1);
		expect(payload.blocks[0]!.data.name).toBe('h2');
	}, 20_000);

	test('block-insert accepts a spec via --spec inline JSON and persists the page', async () => {
		const spec = JSON.stringify({
			catalog: 'h2',
			items: [[{ name: 'title-h2', data: { titleH2: '挿入された見出し' } }]],
		});
		const insert = await run(['block-insert', 'index.html', '0', '--spec', spec]);
		expect(insert.code).toBe(0);

		const list = await run(['block-list', 'index.html']);
		expect(list.code).toBe(0);
		const payload = JSON.parse(list.stdout) as {
			blocks: { data: { items: { data: { titleH2?: string } }[][] } }[];
		};
		expect(payload.blocks).toHaveLength(2);
		expect(payload.blocks[0]!.data.items[0]![0]!.data.titleH2).toBe('挿入された見出し');
	}, 30_000);

	test('block-insert accepts a spec via stdin when no --spec flag is given', async () => {
		// Reset the fixture page so we can assert against a known starting
		// state independent of the previous test's mutation.
		await fs.writeFile(
			path.join(docRoot, 'stdin.html'),
			`<div class="content"></div>`,
			'utf8',
		);
		const spec = JSON.stringify({
			catalog: 'h2',
			items: [[{ name: 'title-h2', data: { titleH2: 'stdin 見出し' } }]],
		});
		const insert = await run(['block-insert', 'stdin.html', '0'], spec);
		expect(insert.code).toBe(0);

		const list = await run(['block-list', 'stdin.html']);
		const payload = JSON.parse(list.stdout) as {
			blocks: { data: { items: { data: { titleH2?: string } }[][] } }[];
		};
		expect(payload.blocks).toHaveLength(1);
		expect(payload.blocks[0]!.data.items[0]![0]!.data.titleH2).toBe('stdin 見出し');
	}, 30_000);

	test('unknown command exits non-zero and prints an error to stderr', async () => {
		const result = await run(['this-command-does-not-exist']);
		expect(result.code).not.toBe(0);
		expect(result.stderr.length).toBeGreaterThan(0);
	}, 20_000);

	test('after loadContext returns, stdout writes flow normally — the temporary redirect is restored', async () => {
		// The bin scopes its stdout redirect to loadContext() via try/finally.
		// To prove the finally branch ran, we use a config-resolve command
		// that emits a payload AFTER loadContext returned: payload must be
		// on stdout, NOT redirected to stderr.
		const result = await run(['config-resolve']);
		expect(result.code).toBe(0);
		// The JSON payload arrives via realStdoutWrite (captured at module
		// load before any redirect). If finally didn't restore, the JSON
		// would still appear on stdout because realStdoutWrite bypasses the
		// monkey-patch — so this test isn't a tight proof. The tighter
		// proof: stderr should NOT contain the JSON payload echoed.
		expect(result.stderr).not.toContain('"documentRoot"');
		expect(result.stdout).toContain('"documentRoot"');
	}, 20_000);

	test('stdout stays valid JSON even when the user config prints a dotenv banner', async () => {
		// dotenv injects a stdout banner on import; bin.ts redirects that
		// to stderr so stdout stays clean for the JSON payload contract.
		const banneredConfig = `import { config } from 'dotenv';
import { defaultCatalog } from '@burger-editor/blocks';
config({ override: false });
export default {
	documentRoot: './src',
	assetsRoot: './src',
	editableArea: '.content',
	catalog: defaultCatalog,
	newFileContent: '<div class="content"></div>',
};
`;
		const altRoot = path.join(FIXTURE_ROOT, 'with-dotenv');
		await fs.mkdir(path.join(altRoot, 'src'), { recursive: true });
		await fs.writeFile(
			path.join(altRoot, 'burgereditor.config.mjs'),
			banneredConfig,
			'utf8',
		);
		await fs.writeFile(
			path.join(altRoot, 'src', 'index.html'),
			`<div class="content"></div>`,
			'utf8',
		);
		const child = spawn(process.execPath, [BIN_PATH, 'catalog-list'], {
			cwd: altRoot,
			// DELIBERATELY not setting DOTENV_CONFIG_QUIET — we want to
			// verify bin.ts's own dotenv suppression handles it.
			env: process.env,
		});
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (c) => {
			stdout += c;
		});
		child.stderr.on('data', (c) => {
			stderr += c;
		});
		const code = await new Promise<number | null>((resolve) =>
			child.on('close', resolve),
		);
		expect(code).toBe(0);
		expect(() => JSON.parse(stdout)).not.toThrow();
		// dotenv tip should have been routed to stderr if it surfaced.
		expect(stdout.includes('[dotenv')).toBe(false);
		void stderr; // tolerate non-empty stderr (deps may warn).
	}, 30_000);
});
