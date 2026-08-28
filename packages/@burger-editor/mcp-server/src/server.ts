import fs from 'node:fs';
import path from 'node:path';

import { agentInstructions } from '@burger-editor/cli';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const packageJsonPath = path.resolve(import.meta.dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version || 'N/A';

const server = new McpServer(
	{
		name: 'burger-editor',
		version,
	},
	{ instructions: agentInstructions },
);

export default server;
