#!/usr/bin/env node

import { runSearchCommand } from './commands/search.js';
import { runServerCommand } from './commands/server.js';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'search') {
	// Extract queries (exclude flags)
	const queries = args.slice(1).filter((arg) => !arg.startsWith('--') && arg !== '-h');

	const flags = {
		url: args.includes('--url'),
		help: args.includes('--help') || args.includes('-h'),
	};

	await runSearchCommand(queries, flags);
} else {
	// Default: start server (backward compatible)
	await runServerCommand();
}
