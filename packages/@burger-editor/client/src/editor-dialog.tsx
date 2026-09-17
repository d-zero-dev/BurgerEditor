import type { ReactNode } from 'react';
import type { FallbackProps } from 'react-error-boundary';

import { Suspense, useActionState, useEffect, useId, useRef, useState } from 'react';
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
 * handlers. Submission goes through `<form action>` (`useActionState`):
 * on success the dialog stays under the caller's control (the action is
 * responsible for closing it — typically `engine.uiState.closeDialog()`
 * + `engine.save()`); on a thrown error the dialog stays open and shows
 * the message via `role="alert"`, and the submit button is disabled
 * while pending.
 * @param root0
 * @param root0.name
 * @param root0.open
 * @param root0.onClose
 * @param root0.action
 * @param root0.buttons
 * @param root0.buttons.close
 * @param root0.buttons.complete
 * @param root0.children
 * @example
 * ```tsx
 * <EditorDialog
 * 	name="options"
 * 	open={block !== null}
 * 	onClose={() => { engine.uiState.closeDialog(); engine.save(); }}
 * 	action={(formData) => {
 * 		applyBlockOptions(block, formData);
 * 		engine.uiState.closeDialog();
 * 		engine.save();
 * 	}}
 * 	buttons={{ close: 'キャンセル', complete: '決定' }}>
 * 	{block ? <BlockOptions block={block} /> : null}
 * </EditorDialog>
 * ```
 */
export function EditorDialog({
	name,
	open,
	onClose,
	action,
	buttons,
	children,
}: {
	readonly name: string;
	readonly open: boolean;
	readonly onClose: () => void;
	readonly action?: (formData: FormData) => void | Promise<void>;
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

	// EditorDialog自体は同一ダイアログ枠（catalog/options/item-editor）を
	// 使い回すため、closeせずopenが再度trueになっただけ（例: キャンセル後
	// 別のブロック/itemを開いた）では通常アンマウントされない。
	// useActionStateのerrorをそこに放置すると、前回の送信失敗メッセージが
	// 無関係な次回の編集対象に対して即座に表示されてしまう。
	// open が false→true になるたびにgenerationを進め、useActionStateを
	// 持つ内側だけをkeyで作り直してリセットする（`<dialog>`自体の
	// showModal/closeライフサイクルに関わるdialogRef/dialogIdは
	// 安定させたいので、EditorDialog自体はremountしない）
	const [prevOpen, setPrevOpen] = useState(open);
	const [generation, setGeneration] = useState(0);
	if (open !== prevOpen) {
		setPrevOpen(open);
		if (open) {
			setGeneration((g) => g + 1);
		}
	}

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
			onClose={(e) => {
				// Reactのcloseイベントはツリーをバブルすることがある既知の
				// 問題があるため、このdialog自身が発火元のときだけ処理する
				if (e.target !== e.currentTarget) {
					return;
				}
				onClose();
			}}>
			<EditorDialogBody
				key={generation}
				name={name}
				formId={formId}
				dialogId={dialogId}
				open={open}
				action={action}
				buttons={buttons}>
				{children}
			</EditorDialogBody>
		</dialog>
	);
}

/**
 * The form + footer, split out from {@link EditorDialog} solely so it can
 * be remounted (via a `key` the caller bumps on each open) without also
 * remounting the `<dialog>` element itself — see the comment at the
 * `key={generation}` call site for why.
 * @param root0
 * @param root0.name
 * @param root0.formId
 * @param root0.dialogId
 * @param root0.open
 * @param root0.action
 * @param root0.buttons
 * @param root0.buttons.close
 * @param root0.buttons.complete
 * @param root0.children
 */
function EditorDialogBody({
	name,
	formId,
	dialogId,
	open,
	action,
	buttons,
	children,
}: {
	readonly name: string;
	readonly formId: string;
	readonly dialogId: string;
	readonly open: boolean;
	readonly action?: (formData: FormData) => void | Promise<void>;
	readonly buttons?: {
		readonly close?: string;
		readonly complete?: string;
	};
	readonly children: ReactNode;
}) {
	const [error, submitAction, isPending] = useActionState<string | null, FormData>(
		async (_prevError, formData) => {
			try {
				await action?.(formData);
				return null;
			} catch (error_) {
				return error_ instanceof Error ? error_.message : String(error_);
			}
		},
		null,
	);

	return (
		<>
			<div>
				<form
					id={formId}
					action={submitAction}
					noValidate
					autoComplete="off"
					autoCapitalize="off">
					<div data-bge-component={`${name}-dialog`}>
						{open ? (
							<ErrorBoundary FallbackComponent={DialogErrorFallback}>
								<Suspense fallback={<DialogSkeleton />}>{children}</Suspense>
							</ErrorBoundary>
						) : null}
					</div>
					{error ? <p role="alert">{error}</p> : null}
				</form>
			</div>
			<footer>
				{buttons?.close ? (
					<button type="button" command="close" commandfor={dialogId}>
						{buttons.close}
					</button>
				) : null}
				{buttons?.complete ? (
					<button type="submit" form={formId} disabled={isPending} aria-busy={isPending}>
						{buttons.complete}
					</button>
				) : null}
			</footer>
		</>
	);
}
