import { BGE_COMMAND, COMMAND_BUS_ID } from '@burger-editor/core';

/**
 * Button shown in an empty editable area to insert the first block.
 * Declares the engine command instead of taking a callback.
 * @example
 * ```tsx
 * reactMount(<InitialInsertionButton />, container);
 * ```
 */
export function InitialInsertionButton() {
	return (
		<button
			className="insert_after"
			type="button"
			command={BGE_COMMAND.insertInitialBlock}
			commandfor={COMMAND_BUS_ID}>
			下に要素を追加
		</button>
	);
}
