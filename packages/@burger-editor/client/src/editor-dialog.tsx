import type { ReactNode } from 'react';
import type { FallbackProps } from 'react-error-boundary';

import { Suspense, useEffect, useId, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import './invoker-commands.js';

/**
 * Minimal fallback for a dialog body that suspended and then threw.
 * Display-only — the dialog's own close button (outside this boundary,
 * in the footer) is always available as a way out.
 * @param root0
 * @param root0.error
 */
function DialogErrorFallback({ error }: FallbackProps) {
	return (
		<p role="alert">
			エラーが発生しました: {error instanceof Error ? error.message : String(error)}
		</p>
	);
}

/**
 * Suspense fallback shown while a dialog body's `use()` calls are
 * pending (e.g. content stylesheet fetch). Kept intentionally small —
 * the dialog chrome (title, footer buttons) renders immediately.
 */
function DialogSkeleton() {
	return <p aria-busy="true">読み込み中…</p>;
}

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
 * 	{block ? <BlockOptions block={block} /> : null}
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
					<div data-bge-component={`${name}-dialog`}>
						{open ? (
							<ErrorBoundary FallbackComponent={DialogErrorFallback}>
								<Suspense fallback={<DialogSkeleton />}>{children}</Suspense>
							</ErrorBoundary>
						) : null}
					</div>
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
