/* @jsxImportSource react */
import type { ReactNode } from 'react';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';

import { useCommand } from '../use-command.js';

/**
 * Supported field types for Front Matter editor
 */
type FieldType = 'text' | 'number' | 'boolean' | 'date' | 'json';

/**
 * Field definition for Front Matter
 */
export interface FieldDefinition {
	readonly key: string;
	readonly type: FieldType;
	readonly value: unknown;
}

/**
 * Owns the Front Matter field list — the actual data, as opposed to the
 * view's own UI-only state (collapsed, add-dialog-open, in-progress JSON
 * drafts). `createFrontMatterEditor`'s handle reads `getData()`/
 * `getSnapshot()` directly and subscribes to be notified of changes,
 * instead of a mutable closure variable updated from inside a React
 * callback — the handle has no other way to read React state from
 * outside React.
 */
export class FrontMatterStore {
	readonly getSnapshot = (): readonly FieldDefinition[] => this.#fields;
	readonly subscribe = (listener: () => void): (() => void) => {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	};
	#fields: readonly FieldDefinition[];
	readonly #listeners = new Set<() => void>();

	constructor(initialData: Record<string, unknown>) {
		this.#fields = parseInitialData(initialData);
	}

	getData(): Record<string, unknown> {
		return toData(this.#fields);
	}

	setFields(next: readonly FieldDefinition[]): void {
		this.#fields = next;
		for (const listener of this.#listeners) {
			listener();
		}
	}
}

/**
 * Options for the Front Matter editor
 */
export interface FrontMatterEditorOptions {
	/** Container element to render the editor */
	readonly container: HTMLElement;
	/** Initial Front Matter data */
	readonly initialData: Record<string, unknown>;
	/** Whether Front Matter originally existed */
	readonly hasFrontMatter: boolean;
	/** Callback when data changes */
	readonly onUpdated?: (data: Record<string, unknown>) => void;
}

/**
 * Handle returned by {@link createFrontMatterEditor}.
 */
export interface FrontMatterEditorHandle extends Disposable {
	/**
	 * Get current Front Matter data
	 */
	getData(): Record<string, unknown>;
	/**
	 * Get original Front Matter string for format preservation
	 */
	getOriginalFrontMatter(): string | undefined;
	/**
	 * Unmount the editor UI.
	 * @deprecated Use a `using` declaration (`[Symbol.dispose]`) instead.
	 */
	unmount(): void;
}

/**
 * Mount the Front Matter editor (a React component) into the given
 * container.
 *
 * The field list is rendered declaratively from React state, so
 * toggling the panel or editing other fields never rebuilds the inputs
 * — focus, caret position and IME composition survive re-renders.
 * @param options - Mount target and initial data
 * @returns A handle exposing the latest data and an unmount function
 * @example
 * ```ts
 * const editor = createFrontMatterEditor({
 * 	container: document.querySelector('.front-matter-editor')!,
 * 	initialData: { title: 'ページ' },
 * 	hasFrontMatter: true,
 * 	onUpdated: (data) => debouncedSave(data),
 * });
 * editor.getData(); // => { title: 'ページ' }
 * ```
 */
export function createFrontMatterEditor(
	options: FrontMatterEditorOptions,
): FrontMatterEditorHandle {
	const store = new FrontMatterStore(options.initialData);
	const originalFrontMatter = options.hasFrontMatter
		? JSON.stringify(options.initialData)
		: undefined;

	// onUpdatedはstoreの変化そのものに反応する — Reactのレンダーサイクルを
	// 経由するコールバックpropではなく、subscribe/getSnapshotの外部ストア
	// 契約だけで完結する
	const unsubscribe = store.subscribe(() => {
		options.onUpdated?.(store.getData());
	});

	const root = createRoot(options.container);
	root.render(<FrontMatterEditorView store={store} />);

	const teardown = () => {
		unsubscribe();
		root.unmount();
	};

	return {
		getData: () => store.getData(),
		getOriginalFrontMatter: () => originalFrontMatter,
		// unmountと[Symbol.dispose]は同じ関数を指す — thisに依存する実装だと
		// 分割代入経由の呼び出しでthisが外れてTypeErrorになるため、
		// 共有クロージャへの参照にしている
		unmount: teardown,
		[Symbol.dispose]: teardown,
	};
}

/**
 * Front Matterの動的フォーム本体。フィールド一覧は`store`（唯一の
 * データソース）から読み、折りたたみ・追加ダイアログ・JSON下書きは
 * この見た目だけのUI状態としてローカルに持つ。操作は Invoker Commands
 * （`--fm-toggle` / `--fm-add-field` / `--fm-delete-field`）で受ける
 * @param root0
 * @param root0.store
 * @example
 * ```tsx
 * <FrontMatterEditorView store={new FrontMatterStore({ title: 'ページ' })} />
 * ```
 */
export function FrontMatterEditorView({ store }: { readonly store: FrontMatterStore }) {
	const rootId = useId();
	const dialogId = useId();
	const fields = useSyncExternalStore(store.subscribe, store.getSnapshot);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	// JSONフィールドの未確定テキスト。パースに失敗している間は確定値を
	// 変えずに入力中の文字列を保持する（キーはフィールドkey）
	const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({});

	const applyFields = (next: readonly FieldDefinition[]) => {
		store.setFields(next);
	};

	const updateFieldValue = (key: string, value: unknown) => {
		applyFields(fields.map((f) => (f.key === key ? { ...f, value } : f)));
	};

	const rootRef = useCommand<HTMLDivElement>({
		'--fm-toggle': () => {
			setIsCollapsed((prev) => !prev);
		},
		'--fm-add-field': () => {
			setAddDialogOpen(true);
		},
		'--fm-delete-field': (e) => {
			const key = (e.source as HTMLButtonElement | null)?.value;
			if (key == null) {
				return;
			}
			applyFields(fields.filter((f) => f.key !== key));
			// 未確定のJSONドラフトも削除する。残すと同名キーを再追加した
			// ときに古い（無効な場合もある）テキストが復活してしまう
			setJsonDrafts((prev) => {
				const { [key]: _removed, ...rest } = prev;
				return rest;
			});
		},
	});

	const onAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const key = String(formData.get('key') ?? '');
		const type = formData.get('type') as FieldType;

		// 既存キーとの重複は黙って拒否する（値の上書き事故を防ぐ）
		if (key && !fields.some((f) => f.key === key)) {
			applyFields([...fields, { key, type, value: getDefaultValue(type) }]);
		}

		setAddDialogOpen(false);
	};

	return (
		<div ref={rootRef} id={rootId} className="fm-editor">
			<div className="fm-editor-header">
				<button
					type="button"
					className="fm-editor-toggle"
					aria-expanded={!isCollapsed}
					command="--fm-toggle"
					commandfor={rootId}>
					<span className="fm-editor-toggle-icon">{isCollapsed ? '▶' : '▼'}</span>
					<span>Front Matter</span>
				</button>
				<button
					type="button"
					className="fm-editor-add"
					title="フィールドを追加"
					command="--fm-add-field"
					commandfor={rootId}>
					{'+ 追加'}
				</button>
			</div>
			{isCollapsed ? null : (
				<div className="fm-editor-fields">
					{fields.length === 0 ? (
						<div className="fm-editor-empty">
							フィールドがありません。「+ 追加」ボタンでフィールドを追加してください。
						</div>
					) : (
						fields.map((field) => (
							<div key={field.key} className="fm-editor-field" data-type={field.type}>
								<label
									className="fm-editor-field-label"
									htmlFor={`${rootId}-field-${field.key}`}>
									{field.key}
								</label>
								<div className="fm-editor-field-input">
									<FieldInput
										field={field}
										inputId={`${rootId}-field-${field.key}`}
										jsonDraft={jsonDrafts[field.key]}
										onValueChange={(value) => updateFieldValue(field.key, value)}
										onJsonDraftChange={(text) => {
											setJsonDrafts((prev) => ({ ...prev, [field.key]: text }));
										}}
									/>
								</div>
								<button
									type="button"
									className="fm-editor-field-delete"
									title="フィールドを削除"
									command="--fm-delete-field"
									commandfor={rootId}
									value={field.key}>
									×
								</button>
							</div>
						))
					)}
				</div>
			)}
			{addDialogOpen ? (
				<AddFieldDialog
					dialogId={dialogId}
					onSubmit={onAddSubmit}
					onClose={() => setAddDialogOpen(false)}
				/>
			) : null}
		</div>
	);
}

/**
 * 型別のcontrolled input
 * @param root0
 * @param root0.field
 * @param root0.inputId
 * @param root0.jsonDraft
 * @param root0.onValueChange
 * @param root0.onJsonDraftChange
 */
function FieldInput({
	field,
	inputId,
	jsonDraft,
	onValueChange,
	onJsonDraftChange,
}: {
	readonly field: FieldDefinition;
	readonly inputId: string;
	readonly jsonDraft: string | undefined;
	readonly onValueChange: (value: unknown) => void;
	readonly onJsonDraftChange: (text: string) => void;
}): ReactNode {
	switch (field.type) {
		case 'boolean': {
			return (
				<input
					id={inputId}
					type="checkbox"
					checked={Boolean(field.value)}
					onChange={(e) => onValueChange(e.currentTarget.checked)}
				/>
			);
		}
		case 'number': {
			return (
				<input
					id={inputId}
					type="number"
					value={field.value == null ? '' : String(field.value)}
					onChange={(e) => {
						onValueChange(
							e.currentTarget.value === '' ? null : Number(e.currentTarget.value),
						);
					}}
				/>
			);
		}
		case 'date': {
			return (
				<input
					id={inputId}
					type="date"
					value={toDateInputValue(field.value)}
					onChange={(e) => onValueChange(e.currentTarget.value)}
				/>
			);
		}
		case 'json': {
			const text = jsonDraft ?? stringifyJson(field.value);
			return (
				<textarea
					id={inputId}
					rows={3}
					className={isValidJson(text) ? undefined : 'fm-editor-error'}
					value={text}
					onChange={(e) => {
						const nextText = e.currentTarget.value;
						onJsonDraftChange(nextText);
						try {
							onValueChange(JSON.parse(nextText) as unknown);
						} catch {
							// 不正なJSONの間は確定値を変えない（テキストは保持）
						}
					}}
				/>
			);
		}
		default: {
			return (
				<input
					id={inputId}
					type="text"
					value={String(field.value ?? '')}
					onChange={(e) => onValueChange(e.currentTarget.value)}
				/>
			);
		}
	}
}

/**
 * フィールド追加ダイアログ。マウント時にshowModalし、close（キャンセル
 * ボタンの組み込みcloseコマンド / Escキー）でアンマウントされる
 * @param root0
 * @param root0.dialogId
 * @param root0.onSubmit
 * @param root0.onClose
 */
function AddFieldDialog({
	dialogId,
	onSubmit,
	onClose,
}: {
	readonly dialogId: string;
	readonly onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
	readonly onClose: () => void;
}) {
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (dialog && !dialog.open) {
			dialog.showModal();
		}
	}, []);

	return (
		<dialog ref={dialogRef} className="fm-editor-dialog" id={dialogId} onClose={onClose}>
			<form onSubmit={onSubmit}>
				<h3>フィールドを追加</h3>
				<div className="fm-editor-dialog-field">
					<label htmlFor={`${dialogId}-key`}>キー名</label>
					<input
						type="text"
						id={`${dialogId}-key`}
						name="key"
						required
						placeholder="例: title, author, date"
					/>
				</div>
				<div className="fm-editor-dialog-field">
					<label htmlFor={`${dialogId}-type`}>型</label>
					<select id={`${dialogId}-type`} name="type">
						<option value="text">テキスト</option>
						<option value="number">数値</option>
						<option value="boolean">真偽値</option>
						<option value="date">日付</option>
						<option value="json">JSON（配列/オブジェクト）</option>
					</select>
				</div>
				<div className="fm-editor-dialog-actions">
					<button
						type="button"
						className="fm-editor-dialog-cancel"
						command="close"
						commandfor={dialogId}>
						キャンセル
					</button>
					<button type="submit" className="fm-editor-dialog-submit">
						追加
					</button>
				</div>
			</form>
		</dialog>
	);
}

/**
 * Parse initial data and detect field types
 * @param data
 */
function parseInitialData(data: Record<string, unknown>): FieldDefinition[] {
	return Object.entries(data).map(([key, value]) => ({
		key,
		type: detectType(value),
		value,
	}));
}

/**
 * フィールド一覧をFront Matterデータへ畳み込む
 * @param fields
 */
function toData(fields: readonly FieldDefinition[]): Record<string, unknown> {
	const data: Record<string, unknown> = {};
	for (const field of fields) {
		data[field.key] = field.value;
	}
	return data;
}

/**
 * Detect the type of a value
 * @param value
 */
function detectType(value: unknown): FieldType {
	if (typeof value === 'boolean') {
		return 'boolean';
	}
	if (typeof value === 'number') {
		return 'number';
	}
	if (typeof value === 'string') {
		// Check if it's an ISO date string
		if (/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2})?/.test(value)) {
			const parsed = Date.parse(value);
			if (!Number.isNaN(parsed)) {
				return 'date';
			}
		}
		return 'text';
	}
	if (value instanceof Date) {
		return 'date';
	}
	// Arrays and objects
	if (typeof value === 'object' && value !== null) {
		return 'json';
	}
	return 'text';
}

/**
 * Get default value for a type
 * @param type
 */
function getDefaultValue(type: FieldType): unknown {
	switch (type) {
		case 'boolean': {
			return false;
		}
		case 'number': {
			return 0;
		}
		case 'date': {
			return new Date().toISOString().split('T')[0];
		}
		case 'json': {
			return [];
		}
		default: {
			return '';
		}
	}
}

/**
 * `<input type="date">` に渡せる `yyyy-mm-dd` へ正規化する。
 * 不正な日付は空文字（未入力）にする
 * @param value
 */
function toDateInputValue(value: unknown): string {
	if (!value) {
		return '';
	}
	const dateValue = value instanceof Date ? value : new Date(String(value));
	if (Number.isNaN(dateValue.getTime())) {
		return '';
	}
	return dateValue.toISOString().split('T')[0] ?? '';
}

/**
 * @param value
 */
function stringifyJson(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

/**
 * @param text
 */
function isValidJson(text: string): boolean {
	try {
		JSON.parse(text);
		return true;
	} catch {
		return false;
	}
}
