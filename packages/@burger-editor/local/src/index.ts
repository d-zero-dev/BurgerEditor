#!/usr/bin/env node

import type { CliArgs } from './commands/parse-cli-args.js';

import { parseCliArgs } from './commands/parse-cli-args.js';
import { runSearchCommand } from './commands/search.js';
import { runServerCommand } from './commands/server.js';

let args: CliArgs;
try {
	args = parseCliArgs(process.argv.slice(2));
} catch (error) {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
	process.exit(1);
}

if (args.command === 'search') {
	await runSearchCommand(args.queries, args.flags, { configPath: args.configPath });
} else {
	// Default: start server (backward compatible)
	await runServerCommand({ configPath: args.configPath });
}
