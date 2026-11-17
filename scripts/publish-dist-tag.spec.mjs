// Runs the "Determine dist-tag" step of .github/workflows/publish.yml in bash,
// with a stub `npm` that reports the major on `latest`, because the step
// decides which dist-tag a release takes and a wrong answer cannot be taken
// back (publishing is irreversible).
//
// The step is cut out of the workflow with a text match on its name and
// indentation instead of a YAML parser: the root package has no YAML parser
// to depend on, and a renamed step or a changed indentation makes
// `readStepScript` throw with a message that says what to look at, instead of
// the step silently going untested.

import { execFileSync } from 'node:child_process';
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @returns {string} The shell script of the step, with the indentation of the YAML removed.
 */
function readStepScript() {
	const workflow = readFileSync(path.join(root, '.github/workflows/publish.yml'), 'utf8');
	const start = workflow.indexOf('- name: Determine dist-tag');
	if (start === -1) {
		throw new Error('publish.yml has no step named "Determine dist-tag"');
	}
	const marker = 'run: |\n';
	const bodyStart = workflow.indexOf(marker, start);
	if (bodyStart === -1) {
		throw new Error('The "Determine dist-tag" step of publish.yml has no `run: |` block');
	}
	const body = workflow.slice(bodyStart + marker.length);
	const end = body.search(/\n {6}- name: /);
	if (end === -1) {
		throw new Error('Could not find the step after "Determine dist-tag" in publish.yml');
	}
	return body
		.slice(0, end)
		.split('\n')
		.map((line) => line.replace(/^ {10}/, ''))
		.join('\n');
}

let dir;

beforeEach(() => {
	dir = mkdtempSync(path.join(tmpdir(), 'bge-dist-tag-'));
	mkdirSync(path.join(dir, 'bin'));
	// Only `npm view @burger-editor/client@latest version` is answered, with
	// $FAKE_LATEST (an empty one answers with nothing, as npm does when there
	// is no `latest`), or with a failure when it is unset (a registry outage).
	// Any other question fails, so the step cannot ask about another package.
	writeFileSync(
		path.join(dir, 'bin/npm'),
		[
			'#!/bin/sh',
			'if [ "$*" != "view @burger-editor/client@latest version" ]; then echo "unexpected npm call: $*" >&2; exit 2; fi',
			'if [ -z "${FAKE_LATEST+x}" ]; then echo "npm error code ECONNRESET" >&2; exit 1; fi',
			'echo "$FAKE_LATEST"',
			'',
		].join('\n'),
	);
	chmodSync(path.join(dir, 'bin/npm'), 0o755);
	writeFileSync(path.join(dir, 'step.sh'), readStepScript());
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

/**
 * @param {string} version The version in lerna.json.
 * @param {string | undefined} latest The version on `latest`; undefined makes npm fail.
 * @returns {{ tag: string | null, failed: boolean, output: string }} `output` is stdout and stderr.
 */
function run(version, latest) {
	writeFileSync(path.join(dir, 'lerna.json'), JSON.stringify({ version }));
	writeFileSync(path.join(dir, 'output'), '');
	const env = {
		...process.env,
		PATH: `${path.join(dir, 'bin')}:${process.env.PATH}`,
		GITHUB_OUTPUT: path.join(dir, 'output'),
	};
	delete env.FAKE_LATEST;
	if (latest !== undefined) {
		env.FAKE_LATEST = latest;
	}
	let failed = false;
	let output = '';
	try {
		output = execFileSync('bash', ['-e', path.join(dir, 'step.sh')], {
			cwd: dir,
			env,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		});
	} catch (error) {
		failed = true;
		output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
	}
	const written = readFileSync(path.join(dir, 'output'), 'utf8');
	return { tag: /^tag=(.+)$/m.exec(written)?.[1] ?? null, failed, output };
}

describe('the wiring of the dist-tag step in publish.yml', () => {
	// The tests below run the step alone. What a wrong wiring does is worse than
	// a wrong answer from the step: lerna reads an empty `--dist-tag` as "not
	// given" and publishes under `latest`, so a renamed step id or a dropped
	// flag would let a release of this line take `latest` from a newer major
	// while every other test stays green.
	const workflow = readFileSync(path.join(root, '.github/workflows/publish.yml'), 'utf8');

	it('decides the tag before anything is installed or built', () => {
		const decide = workflow.indexOf('- name: Determine dist-tag');
		expect(decide).toBeGreaterThan(-1);
		expect(decide).toBeLessThan(workflow.indexOf('- name: Install dependencies'));
		expect(decide).toBeLessThan(workflow.indexOf('- name: Build'));
	});

	it('hands the tag of the step to lerna through DIST_TAG, and refuses an empty one', () => {
		expect(workflow).toContain('id: dist-tag');
		expect(workflow).toContain('DIST_TAG: ${{ steps.dist-tag.outputs.tag }}');
		expect(workflow).toContain('lerna publish from-package --dist-tag "$DIST_TAG"');
		expect(workflow).toContain('-z "$DIST_TAG"');
	});
});

describe('the dist-tag of a release of the 3.x line', () => {
	it.each([
		['3.5.1', '3.5.0'],
		['3.6.0', '3.5.1'],
		['3.6.0+build-1', '3.5.1'],
	])('publishes %s under latest while %s is on latest', (version, latest) => {
		expect(run(version, latest)).toMatchObject({ tag: 'latest', failed: false });
	});

	it.each([
		['3.5.1', '4.0.0'],
		['3.6.0', '4.2.1'],
	])('publishes %s under v3 once %s, a newer major, is on latest', (version, latest) => {
		// after the 4.x line is stable, `latest` belongs to it
		expect(run(version, latest)).toMatchObject({ tag: 'v3', failed: false });
	});

	const prereleases = ['3.6.0-alpha.1', '3.6.0-beta.1', '3.6.0-rc.1', '3.6.0-next.1'];
	const latests = ['3.5.0', '4.0.0'];
	it.each(prereleases.flatMap((version) => latests.map((latest) => [version, latest])))(
		'refuses the prerelease %s (latest is %s), because this line publishes stable releases only',
		(version, latest) => {
			const result = run(version, latest);
			expect(result).toMatchObject({ tag: null, failed: true });
			expect(result.output).toContain(
				`::error::${version} is a prerelease; the 3.x line publishes stable releases only`,
			);
		},
	);

	it.each(['4.0.0', '2.9.0'])(
		'refuses %s, which is not 3.x and would take latest from the other line',
		(version) => {
			const result = run(version, '3.5.0');
			expect(result).toMatchObject({ tag: null, failed: true });
			expect(result.output).toContain(`::error::${version} is not a 3.x version`);
		},
	);

	it.each(['', '3', '3.5', 'garbage', 'v3.5.1'])(
		'refuses the version "%s" in lerna.json, which is not a version',
		(version) => {
			const result = run(version, '3.5.0');
			expect(result).toMatchObject({ tag: null, failed: true });
			expect(result.output).toContain(
				`::error::'${version}' in lerna.json is not a version`,
			);
		},
	);

	it('refuses to guess when the major on latest cannot be read', () => {
		const result = run('3.5.1');
		expect(result).toMatchObject({ tag: null, failed: true });
		expect(result.output).toContain(
			'::error::Could not read the version of the latest release',
		);
	});

	it.each(['', 'not-a-version'])(
		'refuses to guess when latest answers with "%s", which is not a version',
		(latest) => {
			const result = run('3.5.1', latest);
			expect(result).toMatchObject({ tag: null, failed: true });
			expect(result.output).toContain(
				'::error::Could not read the major version of the latest release',
			);
		},
	);

	it('refuses to guess when latest is a prerelease, which does not say which line is current', () => {
		const result = run('3.5.1', '4.0.0-alpha.77');
		expect(result).toMatchObject({ tag: null, failed: true });
		expect(result.output).toContain(
			'::error::The latest release (4.0.0-alpha.77) is a prerelease',
		);
	});

	it('refuses to move latest forward to 3.x when an older major is on latest', () => {
		const result = run('3.5.1', '2.9.0');
		expect(result).toMatchObject({ tag: null, failed: true });
		expect(result.output).toContain(
			'::error::The latest release (2.9.0) is of an older major than 3.x',
		);
	});
});
