export class NoEditableAreaError extends Error {
	/**
	 * Optional list of selectors that *did* exist near the root of the
	 * document. Surfaced to help the caller (or the agent) recover from a
	 * config typo without having to grep the file by hand.
	 */
	readonly candidates: readonly string[];
	readonly selector: string;

	constructor(selector: string, candidates: readonly string[] = []) {
		const suffix =
			candidates.length > 0 ? ` (candidates near root: ${candidates.join(', ')})` : '';
		super(`Editable area not found: ${selector}${suffix}`);
		this.selector = selector;
		this.candidates = candidates;
	}
}
