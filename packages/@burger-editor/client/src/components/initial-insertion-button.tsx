import { BGE_COMMAND } from '@burger-editor/core';

/**
 * Button shown in an empty editable area to insert the first block.
 * Declares the engine command instead of taking a callback.
 * @param root0
 * @param root0.commandBusId
 * @example
 * ```tsx
 * reactMount(<InitialInsertionButton commandBusId={engine.commandBus.receiverId} />, container);
 * ```
 */
export function InitialInsertionButton({
	commandBusId,
}: {
	/** 配送先のコマンドバス受信要素ID。`engine.commandBus.receiverId` */
	readonly commandBusId: string;
}) {
	return (
		<button
			className="insert_after"
			type="button"
			command={BGE_COMMAND.insertInitialBlock}
			commandfor={commandBusId}>
			下に要素を追加
		</button>
	);
}
