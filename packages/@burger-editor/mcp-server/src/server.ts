import fs from 'node:fs';
import path from 'node:path';

import { agentInstructions } from '@burger-editor/cli';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const packageJsonPath = path.resolve(import.meta.dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version || 'N/A';

/**
 * A fresh, tool-less `McpServer` carrying this package's name, version and
 * agent instructions.
 *
 * A factory rather than a module-level singleton: the SDK throws when the
 * same tool name is registered twice on one `McpServer`, so a shared instance
 * would make a second `startServer()` after disposal (or a second spec file
 * in the same worker) fail on registration.
 */
export function createServer(): McpServer {
	return new McpServer(
		{
			name: 'burger-editor',
			version,
		},
		{ instructions: agentInstructions },
	);
}
