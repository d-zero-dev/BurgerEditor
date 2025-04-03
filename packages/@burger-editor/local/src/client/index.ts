import { createEditor } from './create-editor.js';
import { newFile } from './new-file.js';

await Promise.all([
	// Apply BurgerEditor
	createEditor(),

	// Define commands for buttons
	newFile(),
]);
