import { describe, expect, test } from 'vitest';

import { parseCliArgs } from './parse-cli-args.js';

describe('parseCliArgs — server (no subcommand)', () => {
	test('no arguments start the server with the searched config', () => {
		expect(parseCliArgs([])).toEqual({ command: 'server', configPath: undefined });
	});

	test('--config <path> names the config file', () => {
		expect(parseCliArgs(['--config', './burgereditor.child.config.js'])).toEqual({
			command: 'server',
			configPath: './burgereditor.child.config.js',
		});
	});

	test('--config=<path> is accepted too', () => {
		expect(parseCliArgs(['--config=./burgereditor.child.config.js'])).toEqual({
			command: 'server',
			configPath: './burgereditor.child.config.js',
		});
	});

	test('an unrecognized positional still starts the server', () => {
		expect(parseCliArgs(['dev'])).toEqual({ command: 'server', configPath: undefined });
	});
});

describe('parseCliArgs — search', () => {
	test('positionals after "search" are the queries', () => {
		expect(parseCliArgs(['search', 'margin=normal', 'bg-color=blue'])).toEqual({
			command: 'search',
			configPath: undefined,
			queries: ['margin=normal', 'bg-color=blue'],
			flags: { url: false, help: false },
		});
	});

	test('the --config value is not taken as a query', () => {
		expect(
			parseCliArgs(['search', '--config', './child.config.js', 'margin=normal']),
		).toEqual({
			command: 'search',
			configPath: './child.config.js',
			queries: ['margin=normal'],
			flags: { url: false, help: false },
		});
	});

	test('--config may come before the subcommand', () => {
		expect(parseCliArgs(['--config', './child.config.js', 'search', 'margin=*'])).toEqual(
			{
				command: 'search',
				configPath: './child.config.js',
				queries: ['margin=*'],
				flags: { url: false, help: false },
			},
		);
	});

	test('--url and --help / -h set their flags', () => {
		expect(parseCliArgs(['search', 'margin=normal', '--url'])).toMatchObject({
			flags: { url: true, help: false },
		});
		expect(parseCliArgs(['search', '--help'])).toMatchObject({
			flags: { url: false, help: true },
		});
		expect(parseCliArgs(['search', '-h'])).toMatchObject({
			flags: { url: false, help: true },
		});
	});

	test('an unknown flag is ignored rather than rejected or read as a query', () => {
		expect(parseCliArgs(['search', '--verbose', 'margin=normal'])).toMatchObject({
			queries: ['margin=normal'],
		});
	});
});

describe('parseCliArgs — --config without a path', () => {
	test('a bare --config is rejected', () => {
		expect(() => parseCliArgs(['--config'])).toThrow(
			'--config requires a path to a config file.',
		);
	});

	test('an empty --config= is rejected', () => {
		expect(() => parseCliArgs(['search', '--config=', 'margin=normal'])).toThrow(
			'--config requires a path to a config file.',
		);
	});
});
