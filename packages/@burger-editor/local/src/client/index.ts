import { createEditor } from './create-editor.js';
import { hydrateNavTree } from './nav-tree.js';
import { newFile } from './new-file.js';

await Promise.all([
	// Apply BurgerEditor
	createEditor(),

	// Define commands for buttons
	newFile(),

	// Populate the file tree from the server's logical view
	hydrateNavTree(),
]);
