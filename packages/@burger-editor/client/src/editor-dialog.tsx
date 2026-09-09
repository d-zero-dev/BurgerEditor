import type { ReactNode } from 'react';

import { useEffect, useId, useRef } from 'react';

import './invoker-commands.js';

/**
 * Declarative `<dialog>` shell.
 *
 * The markup follows the `dialog.bge-dialog > div > form > div` + `footer`
 * structure that `ui.css` styles. Opening/closing is driven by the `open`
 * prop; the close button uses the built-in `close` command — no click
 * handlers.
 * @param root0
 * @param root0.name
 * @param root0.open
 * @param root0.onClose
 * @param root0.onComplete
 * @param root0.buttons
 * @param root0.buttons.close
 * @param root0.buttons.complete
 * @param root0.children
 * @example
 * ```tsx
 * <EditorDialog
 * 	name="options"
 * 	open={block !== null}
 * 	onClose={() => engine.uiState.closeDialog()}
 * 	onComplete={(formData) => applyBlockOptions(block, formData)}
 * 	buttons={{ close: 'キャンセル', complete: '決定' }}>
 * 	{block ? <BlockOptions engine={engine} block={block} /> : null}
 * </EditorDialog>
 * ```
 */
export function EditorDialog({
	name,
	open,
	onClose,
	onComplete,
	buttons,
	children,
}: {
	readonly name: string;
	readonly open: boolean;
	readonly onClose: () => void;
	readonly onComplete?: (formData: FormData) => void;
	readonly buttons?: {
		readonly close?: string;
		readonly complete?: string;
	};
	readonly children: ReactNode;
}) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	// documentに複数のダイアログ（=複数エンジン）が同時に存在しても
	// commandfor/formのID参照が自分自身だけを指すよう、`name`固定では
	// なくuseIdで一意化する。`data-bge-component`は種別を示すCSS/テスト
	// フックなのでnameのまま残す（＝同名ダイアログを持つ複数エンジン間で
	// 一意ではない。個体を一意に指すDOM参照が要るなら`dialogId`/`formId`
	// を使うこと）
	const uid = useId();
	const dialogId = `${uid}-dialog`;
	const formId = `${uid}-form`;

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) {
			return;
		}
		if (open && !dialog.open) {
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	}, [open]);

	return (
		<dialog
			ref={dialogRef}
			id={dialogId}
			className="bge-dialog"
			closedby="any"
			onClose={onClose}>
			<div>
				<form
					id={formId}
					method="dialog"
					noValidate
					autoComplete="off"
					autoCapitalize="off"
					onSubmit={(e) => {
						e.preventDefault();
						onComplete?.(new FormData(e.currentTarget));
					}}>
					<div data-bge-component={`${name}-dialog`}>{open ? children : null}</div>
				</form>
			</div>
			<footer>
				{buttons?.close ? (
					<button type="button" command="close" commandfor={dialogId}>
						{buttons.close}
					</button>
				) : null}
				{buttons?.complete ? (
					<button type="submit" form={formId}>
						{buttons.complete}
					</button>
				) : null}
			</footer>
		</dialog>
	);
}
