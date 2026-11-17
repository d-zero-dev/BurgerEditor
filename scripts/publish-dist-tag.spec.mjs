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
	// $FAKE_LATEST, or with a failure when it is unset (a registry outage).
	// Any other question fails, so the step cannot ask about another package.
	writeFileSync(
		path.join(dir, 'bin/npm'),
		[
			'#!/bin/sh',
			'if [ "$*" != "view @burger-editor/client@latest version" ]; then echo "unexpected npm call: $*" >&2; exit 2; fi',
			'if [ -z "$FAKE_LATEST" ]; then echo "npm error code ECONNRESET" >&2; exit 1; fi',
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

describe('the dist-tag of a release', () => {
	it('has a step script to run', () => {
		expect(readStepScript()).toContain('GITHUB_OUTPUT');
	});

	it('publishes a v4 prerelease under its prerelease tag while v3 is on latest', () => {
		expect(run('4.0.0-alpha.78', '3.5.0')).toMatchObject({ tag: 'alpha', failed: false });
		expect(run('4.0.0-beta.1', '3.5.0')).toMatchObject({ tag: 'beta', failed: false });
		expect(run('4.0.0-rc.1', '3.5.0')).toMatchObject({ tag: 'rc', failed: false });
	});

	it('publishes a prerelease of a newer major than latest under its prerelease tag', () => {
		expect(run('5.0.0-alpha.1', '3.5.0')).toMatchObject({ tag: 'alpha', failed: false });
	});

	it('publishes the stable release of the current line under latest', () => {
		expect(run('4.0.0', '3.5.0')).toMatchObject({ tag: 'latest', failed: false });
		expect(run('4.0.1', '4.0.0')).toMatchObject({ tag: 'latest', failed: false });
	});

	it('publishes a stable release of the major that is on latest under latest', () => {
		expect(run('3.5.1', '3.5.0')).toMatchObject({ tag: 'latest', failed: false });
	});

	// An older major is released from the branch of its own line, whose workflow
	// decides its tag (a prerelease would move the tag of the current line, and
	// a stable release would take `latest` away from it): this workflow only
	// publishes the current line.
	it.each(['3.5.1', '3.6.0-alpha.1'])(
		'refuses %s, an older major than latest, which is released from its own branch',
		(version) => {
			const result = run(version, '4.0.0');
			expect(result).toMatchObject({ tag: null, failed: true });
			expect(result.output).toContain(
				`::error::${version} is of an older major than the latest release (4.0.0); an older major is released from its own branch`,
			);
		},
	);

	// A malformed major would reach the numeric comparison of bash, which reads
	// a leading zero as octal and stops with an arithmetic error that says
	// nothing about the version
	it.each(['', '4', '4.0', 'garbage', '04.0.0'])(
		'refuses the version "%s" in lerna.json, which is not a version',
		(version) => {
			const result = run(version, '3.5.0');
			expect(result).toMatchObject({ tag: null, failed: true });
			expect(result.output).toContain(
				`::error::'${version}' in lerna.json is not a version`,
			);
		},
	);

	it('refuses a prerelease tag it does not know', () => {
		const result = run('4.0.0-next.1', '3.5.0');
		expect(result).toMatchObject({ tag: null, failed: true });
		expect(result.output).toContain(
			'::error::Unknown prerelease tag in version: 4.0.0-next.1',
		);
	});

	it('refuses to guess when the major on latest cannot be read', () => {
		const result = run('3.5.1');
		expect(result).toMatchObject({ tag: null, failed: true });
		expect(result.output).toContain(
			'::error::Could not read the version of the latest release',
		);
	});

	it('refuses to guess when latest answers with something that is not a version', () => {
		const result = run('3.5.1', 'not-a-version');
		expect(result).toMatchObject({ tag: null, failed: true });
		expect(result.output).toContain(
			'::error::Could not read the major version of the latest release',
		);
	});
});
