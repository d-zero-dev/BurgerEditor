import { describe, expect, test } from 'vitest';

import { CONFIG_FLAG, commands } from './commands.js';

describe('commands', () => {
	// roar has no program-wide flags, so a subcommand added without
	// `...CONFIG_FLAG` would silently ignore `--config` and run against the
	// searched config instead — pin it for every entry.
	test.each(Object.entries(commands))('%s accepts --config', (_name, command) => {
		expect(command.flags).toMatchObject(CONFIG_FLAG);
	});
});
