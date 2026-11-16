// The way the packages write their dependencies: a published package takes its
// external `dependencies` and `peerDependencies` as `^` ranges, so a consumer's
// install can share a copy with the rest of its tree and a peer is not pinned to
// one patch version; everything that is only for this repository stays exact
// (see CLAUDE.md, "依存関係の追加"). The next `yarn add foo@1.2.3` into a
// published package would otherwise go unnoticed.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { compareVersions } from './release-reminder/report.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scope = path.join(root, 'packages/@burger-editor');
const INTERNAL = '@burger-editor/';

/** @returns {{ file: string, manifest: Record<string, any> }[]} */
function readManifests() {
	return readdirSync(scope, { withFileTypes: true })
		.filter(
			(entry) =>
				entry.isDirectory() && existsSync(path.join(scope, entry.name, 'package.json')),
		)
		.map((entry) => {
			const file = `packages/@burger-editor/${entry.name}/package.json`;
			return { file, manifest: JSON.parse(readFileSync(path.join(root, file), 'utf8')) };
		});
}

const manifests = readManifests();
const { version } = JSON.parse(readFileSync(path.join(root, 'lerna.json'), 'utf8'));
const isExact = (range) => /^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(range);

describe('published packages', () => {
	const published = manifests.filter(({ manifest }) => !manifest.private);

	it('are found', () => {
		expect(published.length).toBeGreaterThan(0);
	});

	for (const { file, manifest } of published) {
		describe(file, () => {
			it('writes its external dependencies and peerDependencies as ^ ranges', () => {
				const inexact = ['dependencies', 'peerDependencies'].flatMap((field) =>
					Object.entries(manifest[field] ?? {})
						.filter(([name]) => !name.startsWith(INTERNAL))
						.filter(([, range]) => !range.startsWith('^'))
						.map(([name, range]) => `${field}.${name}: ${range}`),
				);
				expect(inexact, `${file} must write these as ^ ranges`).toEqual([]);
			});

			it('pins the packages of this workspace to the version of lerna.json', () => {
				const others = ['dependencies', 'peerDependencies'].flatMap((field) =>
					Object.entries(manifest[field] ?? {})
						.filter(([name]) => name.startsWith(INTERNAL))
						.filter(([, range]) => range !== version)
						.map(([name, range]) => `${field}.${name}: ${range}`),
				);
				expect(others, `${file} must pin these to ${version}`).toEqual([]);
			});

			it('accepts, in each peerDependency, the version it tests against', () => {
				const rejected = Object.entries(manifest.peerDependencies ?? {})
					.filter(([name]) => manifest.devDependencies?.[name])
					.filter(
						([name, range]) =>
							compareVersions(manifest.devDependencies[name], range.replace(/^\^/, '')) <
							0,
					)
					.map(
						([name, range]) =>
							`${name}: peer ${range}, tested ${manifest.devDependencies[name]}`,
					);
				expect(rejected, `${file}: a peer range below the tested version`).toEqual([]);
			});
		});
	}
});

describe('what is only for this repository stays exact', () => {
	for (const { file, manifest } of manifests) {
		it(`${file}: devDependencies`, () => {
			const inexact = Object.entries(manifest.devDependencies ?? {})
				.filter(([, range]) => !isExact(range))
				.map(([name, range]) => `${name}: ${range}`);
			expect(inexact).toEqual([]);
		});
	}

	for (const { file, manifest } of manifests.filter(({ manifest: m }) => m.private)) {
		it(`${file}: the dependencies of a private package`, () => {
			const inexact = Object.entries(manifest.dependencies ?? {})
				.filter(([, range]) => !isExact(range))
				.map(([name, range]) => `${name}: ${range}`);
			expect(inexact).toEqual([]);
		});
	}
});
