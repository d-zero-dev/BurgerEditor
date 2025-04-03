import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
	'./vitest.config.ts',
	'./packages/@burger-editor/client/vite.config.ts',
	'./packages/@burger-editor/local/vite.config.ts',
]);
