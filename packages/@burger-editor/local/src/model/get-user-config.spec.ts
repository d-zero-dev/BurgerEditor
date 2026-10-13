import fs from 'node:fs/promises';
import path from 'node:path';

import { clearConfigCache } from '@burger-editor/file-io';
import { mkdtempDisposable } from '@d-zero/shared/mkdtemp-disposable';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { WildcardHostError } from '../helpers/host.js';

import { getUserConfig } from './get-user-config.js';

describe('getUserConfig — a config file named via configPath', () => {
	let tmp: { path: string } & AsyncDisposable;
	let childDir: string;
	let childConfigPath: string;

	beforeEach(async () => {
		clearConfigCache();
		tmp = await mkdtempDisposable('bge-get-user-config-');
		childDir = path.join(tmp.path, 'sites', 'child');
		await fs.mkdir(childDir, { recursive: true });
		childConfigPath = path.join(childDir, 'burgereditor.child.config.mjs');
		await fs.writeFile(
			childConfigPath,
			`export default { documentRoot: './src' };\n`,
			'utf8',
		);
	});

	afterEach(async () => {
		await tmp[Symbol.asyncDispose]();
	});

	test('reports the named file as configPath', async () => {
		const { configPath } = await getUserConfig({ configPath: childConfigPath });
		expect(configPath).toBe(childConfigPath);
	});

	test('configDir follows the named file, so the agent token is written next to it', async () => {
		const { configDir } = await getUserConfig({ configPath: childConfigPath });
		expect(configDir).toBe(childDir);
	});

	test('rejects a wildcard host as a config error, before anything is booted (regression: #1001)', async () => {
		await fs.writeFile(
			childConfigPath,
			`export default { documentRoot: './src', host: '0.0.0.0' };\n`,
			'utf8',
		);
		await expect(getUserConfig({ configPath: childConfigPath })).rejects.toThrow(
			WildcardHostError,
		);
	});

	test('the config comes from the named file, with its relative paths resolved against it', async () => {
		const { config } = await getUserConfig({ configPath: childConfigPath });
		expect(config.documentRoot).toBe(path.join(childDir, 'src'));
	});
});
