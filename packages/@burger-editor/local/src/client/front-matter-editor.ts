/**
 * Supported field types for Front Matter editor
 */
type FieldType = 'text' | 'number' | 'boolean' | 'date' | 'json';

/**
 * Field definition for Front Matter
 */
interface FieldDefinition {
	readonly key: string;
	readonly type: FieldType;
	readonly value: unknown;
}

/**
 * Options for FrontMatterEditor
 */
interface FrontMatterEditorOptions {
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
 * FrontMatterEditor - Provides UI for editing Front Matter metadata
 */
export class FrontMatterEditor {
	readonly #container: HTMLElement;
	#fields: FieldDefinition[] = [];
	#hasFrontMatter: boolean;
	#isCollapsed = false;
	readonly #onUpdated?: (data: Record<string, unknown>) => void;
	#originalFrontMatter: string | undefined;

	constructor(options: FrontMatterEditorOptions) {
		this.#container = options.container;
		this.#onUpdated = options.onUpdated;
		this.#hasFrontMatter = options.hasFrontMatter;

		// Convert initial data to field definitions
		this.#fields = this.#parseInitialData(options.initialData);

		// Store original Front Matter for preservation
		if (options.hasFrontMatter) {
			this.#originalFrontMatter = JSON.stringify(options.initialData);
		}

		this.#render();
	}

	/**
	 * Get current Front Matter data
	 */
	getData(): Record<string, unknown> {
		const data: Record<string, unknown> = {};
		for (const field of this.#fields) {
			data[field.key] = field.value;
		}
		return data;
	}

	/**
	 * Get original Front Matter string for format preservation
	 */
	getOriginalFrontMatter(): string | undefined {
		return this.#originalFrontMatter;
	}

	/**
	 * Check if Front Matter has been modified
	 */
	hasChanges(): boolean {
		if (!this.#hasFrontMatter && this.#fields.length === 0) {
			return false;
		}
		const currentData = JSON.stringify(this.getData());
		return currentData !== this.#originalFrontMatter;
	}

	/**
	 * Add a new field
	 * @param key
	 * @param type
	 */
	#addField(key: string, type: FieldType): void {
		const defaultValue = this.#getDefaultValue(type);
		this.#fields.push({ key, type, value: defaultValue });
		this.#hasFrontMatter = true;
		this.#render();
		this.#notifyUpdate();
	}

	/**
	 * Create a field element
	 * @param field
	 * @param index
	 */
	#createFieldElement(field: FieldDefinition, index: number): HTMLElement {
		const fieldEl = document.createElement('div');
		fieldEl.className = 'fm-editor-field';
		fieldEl.dataset.type = field.type;

		const labelEl = document.createElement('label');
		labelEl.className = 'fm-editor-field-label';
		labelEl.textContent = field.key;
		fieldEl.append(labelEl);

		const inputWrapper = document.createElement('div');
		inputWrapper.className = 'fm-editor-field-input';

		const inputEl = this.#createInputElement(field, index);
		inputWrapper.append(inputEl);
		fieldEl.append(inputWrapper);

		// Delete button
		const deleteBtn = document.createElement('button');
		deleteBtn.type = 'button';
		deleteBtn.className = 'fm-editor-field-delete';
		deleteBtn.title = 'フィールドを削除';
		deleteBtn.textContent = '×';
		deleteBtn.addEventListener('click', () => {
			this.#deleteField(index);
		});
		fieldEl.append(deleteBtn);

		return fieldEl;
	}

	/**
	 * Create input element based on field type
	 * @param field
	 * @param index
	 */
	#createInputElement(field: FieldDefinition, index: number): HTMLElement {
		switch (field.type) {
			case 'boolean': {
				const checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				checkbox.checked = Boolean(field.value);
				checkbox.addEventListener('change', () => {
					this.#updateFieldValue(index, checkbox.checked);
				});
				return checkbox;
			}
			case 'number': {
				const input = document.createElement('input');
				input.type = 'number';
				input.value = String(field.value ?? '');
				input.addEventListener('input', () => {
					const numValue = input.value === '' ? null : Number(input.value);
					this.#updateFieldValue(index, numValue);
				});
				return input;
			}
			case 'date': {
				const input = document.createElement('input');
				input.type = 'date';
				// Convert to date string format
				if (field.value) {
					const dateValue =
						field.value instanceof Date ? field.value : new Date(String(field.value));
					if (!Number.isNaN(dateValue.getTime())) {
						const isoDate = dateValue.toISOString().split('T')[0] ?? '';
						input.value = isoDate;
					}
				}
				input.addEventListener('input', () => {
					this.#updateFieldValue(index, input.value);
				});
				return input;
			}
			case 'json': {
				const textarea = document.createElement('textarea');
				textarea.rows = 3;
				try {
					textarea.value = JSON.stringify(field.value, null, 2);
				} catch {
					textarea.value = String(field.value);
				}
				textarea.addEventListener('input', () => {
					try {
						const parsed = JSON.parse(textarea.value) as unknown;
						textarea.classList.remove('fm-editor-error');
						this.#updateFieldValue(index, parsed);
					} catch {
						textarea.classList.add('fm-editor-error');
						// Keep the raw string if JSON is invalid
					}
				});
				return textarea;
			}
			default: {
				// text
				const input = document.createElement('input');
				input.type = 'text';
				input.value = String(field.value ?? '');
				input.addEventListener('input', () => {
					this.#updateFieldValue(index, input.value);
				});
				return input;
			}
		}
	}

	/**
	 * Delete a field
	 * @param index
	 */
	#deleteField(index: number): void {
		this.#fields = this.#fields.filter((_, i) => i !== index);
		this.#render();
		this.#notifyUpdate();
	}

	/**
	 * Detect the type of a value
	 * @param value
	 */
	#detectType(value: unknown): FieldType {
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
	#getDefaultValue(type: FieldType): unknown {
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
	 * Notify update callback
	 */
	#notifyUpdate(): void {
		if (this.#onUpdated) {
			this.#onUpdated(this.getData());
		}
	}

	/**
	 * Parse initial data and detect field types
	 * @param data
	 */
	#parseInitialData(data: Record<string, unknown>): FieldDefinition[] {
		const fields: FieldDefinition[] = [];

		for (const [key, value] of Object.entries(data)) {
			fields.push({
				key,
				type: this.#detectType(value),
				value,
			});
		}

		return fields;
	}

	/**
	 * Render the editor UI
	 */
	#render(): void {
		this.#container.innerHTML = '';
		this.#container.classList.add('fm-editor');

		// Header
		const header = document.createElement('div');
		header.className = 'fm-editor-header';
		header.innerHTML = `
			<button type="button" class="fm-editor-toggle" aria-expanded="${!this.#isCollapsed}">
				<span class="fm-editor-toggle-icon">${this.#isCollapsed ? '▶' : '▼'}</span>
				<span>Front Matter</span>
			</button>
			<button type="button" class="fm-editor-add" title="フィールドを追加">+ 追加</button>
		`;
		this.#container.append(header);

		// Toggle collapse
		const toggleBtn = header.querySelector('.fm-editor-toggle');
		toggleBtn?.addEventListener('click', () => {
			this.#isCollapsed = !this.#isCollapsed;
			this.#render();
		});

		// Add field button
		const addBtn = header.querySelector('.fm-editor-add');
		addBtn?.addEventListener('click', () => {
			this.#showAddFieldDialog();
		});

		// Fields container
		if (!this.#isCollapsed) {
			const fieldsContainer = document.createElement('div');
			fieldsContainer.className = 'fm-editor-fields';

			if (this.#fields.length === 0) {
				const emptyMessage = document.createElement('div');
				emptyMessage.className = 'fm-editor-empty';
				emptyMessage.textContent =
					'フィールドがありません。「+ 追加」ボタンでフィールドを追加してください。';
				fieldsContainer.append(emptyMessage);
			} else {
				for (const [index, field] of this.#fields.entries()) {
					const fieldEl = this.#createFieldElement(field, index);
					fieldsContainer.append(fieldEl);
				}
			}

			this.#container.append(fieldsContainer);
		}
	}

	/**
	 * Show dialog to add a new field
	 */
	#showAddFieldDialog(): void {
		const dialog = document.createElement('dialog');
		dialog.className = 'fm-editor-dialog';
		dialog.innerHTML = `
			<form method="dialog">
				<h3>フィールドを追加</h3>
				<div class="fm-editor-dialog-field">
					<label for="fm-new-key">キー名</label>
					<input type="text" id="fm-new-key" name="key" required placeholder="例: title, author, date" />
				</div>
				<div class="fm-editor-dialog-field">
					<label for="fm-new-type">型</label>
					<select id="fm-new-type" name="type">
						<option value="text">テキスト</option>
						<option value="number">数値</option>
						<option value="boolean">真偽値</option>
						<option value="date">日付</option>
						<option value="json">JSON（配列/オブジェクト）</option>
					</select>
				</div>
				<div class="fm-editor-dialog-actions">
					<button type="button" class="fm-editor-dialog-cancel">キャンセル</button>
					<button type="submit" class="fm-editor-dialog-submit">追加</button>
				</div>
			</form>
		`;

		const cancelBtn = dialog.querySelector('.fm-editor-dialog-cancel');
		cancelBtn?.addEventListener('click', () => {
			dialog.close();
			dialog.remove();
		});

		const form = dialog.querySelector('form');
		form?.addEventListener('submit', (e) => {
			e.preventDefault();
			const formData = new FormData(form);
			const key = formData.get('key') as string;
			const type = formData.get('type') as FieldType;

			if (key && !this.#fields.some((f) => f.key === key)) {
				this.#addField(key, type);
			}

			dialog.close();
			dialog.remove();
		});

		document.body.append(dialog);
		dialog.showModal();

		// Focus the key input
		const keyInput = dialog.querySelector<HTMLInputElement>('#fm-new-key');
		keyInput?.focus();
	}

	/**
	 * Update field value
	 * @param index
	 * @param value
	 */
	#updateFieldValue(index: number, value: unknown): void {
		const field = this.#fields[index];
		if (field) {
			this.#fields[index] = { ...field, value };
			this.#notifyUpdate();
		}
	}
}

/**
 * Create a FrontMatterEditor instance
 * @param options
 */
export function createFrontMatterEditor(
	options: FrontMatterEditorOptions,
): FrontMatterEditor {
	return new FrontMatterEditor(options);
}
