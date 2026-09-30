import type { SearchFlags } from './search.js';

import { parseArgs } from 'node:util';

export type CliArgs =
	| {
			readonly command: 'server';
			readonly configPath: string | undefined;
	  }
	| {
			readonly command: 'search';
			readonly configPath: string | undefined;
			readonly queries: readonly string[];
			readonly flags: SearchFlags;
	  };

/**
 * Parse the `bge` command line. `search` as the first positional selects the
 * search command, whose remaining positionals are its queries; anything else
 * starts the server. `--config <path>` applies to both and may appear before
 * or after the subcommand.
 *
 * `--config` is declared as a value-taking option (rather than filtered out
 * by its `--` prefix) so its path is never mistaken for a search query.
 * Unknown flags are ignored instead of rejected (non-strict parsing), so a
 * stray flag from a wrapper script never keeps the server from starting.
 * @param argv `process.argv.slice(2)`
 * @throws {Error} when `--config` is given without a path
 */
export function parseCliArgs(argv: readonly string[]): CliArgs {
	const { values, positionals } = parseArgs({
		args: [...argv],
		options: {
			config: { type: 'string' },
			url: { type: 'boolean' },
			help: { type: 'boolean', short: 'h' },
		},
		allowPositionals: true,
		strict: false,
	});

	// Non-strict parsing yields `true` for a bare `--config`, `''` for
	// `--config=`, and takes the next token even when it is another flag
	// (`--config --url` → `'--url'`, swallowing `--url`). All three mean the
	// path is missing; a path that really starts with `-` can be written as
	// `./-name.js`.
	if (
		values.config === true ||
		values.config === '' ||
		(typeof values.config === 'string' && values.config.startsWith('-'))
	) {
		throw new Error('--config requires a path to a config file.');
	}
	const configPath = typeof values.config === 'string' ? values.config : undefined;

	if (positionals[0] === 'search') {
		return {
			command: 'search',
			configPath,
			queries: positionals.slice(1),
			flags: {
				url: values.url === true,
				help: values.help === true,
			},
		};
	}
	return { command: 'server', configPath };
}
