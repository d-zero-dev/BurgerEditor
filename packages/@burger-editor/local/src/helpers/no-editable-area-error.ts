export class NoEditableAreaError extends Error {
	readonly selector: string;
	constructor(selector: string) {
		super(`Editable area not found: ${selector}`);
		this.selector = selector;
	}
}
