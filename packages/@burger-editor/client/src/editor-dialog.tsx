import type { ReactNode } from 'react';

import { useEffect, useRef } from 'react';

import './invoker-commands.js';

/**
 * Declarative `<dialog>` shell replacing the class-based EditorDialog.
 *
 * The markup mirrors the legacy `createDefaultDialogShell` structure
 * (`dialog.bge-dialog > div > form > div` + `footer`) so the existing
 * `ui.css` keeps applying. Opening/closing is driven by the `open` prop;
 * the close button uses the built-in `close` command — no click handlers.
 * @param root0
 * @param root0.name
 * @param root0.open
 * @param root0.onClose
 * @param root0.onComplete
 * @param root0.buttons
 * @param root0.buttons.close
 * @param root0.buttons.complete
 * @param root0.children
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
	const dialogId = `${name}-dialog`;
	const formId = `${name}-dialog-form`;

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
					<div data-bge-component={dialogId}>{open ? children : null}</div>
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
