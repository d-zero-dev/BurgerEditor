import type { Submitter } from './dom-helpers/types.js';
import type { BurgerEditorEngine } from './engine/engine.js';
import type { ItemEditorService } from './item/item-editor-service.js';
import type { ItemData, ItemPrimitiveData } from './item/types.js';
import type { BgeWysiwygEditorElement } from '@burger-editor/custom-element';

import { setContent } from '@burger-editor/frozen-patty/set-value';
import { camelCase, kebabCase } from '@burger-editor/utils';

import { EditorDialog } from './editor-dialog.js';
import { getItemEditorTemplate } from './item/get-item-editor-template.js';
import { decodeItemPrimitiveData } from './utils/decode-item-primitive-data.js';
import { encodeItemPrimitiveData } from './utils/encode-item-primitive-data.js';

export class ItemEditorDialog<
	T extends ItemData,
	C extends { [key: string]: unknown } = {},
> extends EditorDialog {
	#contentStylesheetCache: string | null = null;
	readonly #corePrefix = 'bge';
	#service?: ItemEditorService<T, C>;

	constructor(engine: BurgerEditorEngine) {
		super('item-editor', engine, document.createElement('div'), {
			buttons: {
				close: 'キャンセル',
				complete: '決定',
			},
		});
	}

	disable<N extends keyof T & string = keyof T & string>(name: `$${N}`, disabled = true) {
		for (const $ctrl of this.#findAll(name)) {
			$ctrl.disabled = disabled;
		}
	}

	get<N extends keyof T & string = keyof T & string, D extends T[N] = T[N]>(
		name: `$${N}`,
	): D {
		const $ctrl = this.#find(name);
		if ($ctrl instanceof HTMLInputElement) {
			switch ($ctrl.type) {
				case 'radio': {
					const $checked = this.find<HTMLInputElement>(`[name="${$ctrl.name}"]:checked`);
					if ($checked) {
						return $checked.value as D;
					}
					return $ctrl.value as D;
				}
				case 'checkbox': {
					return $ctrl.checked as D;
				}
			}
		}
		return decodeItemPrimitiveData($ctrl.value, $ctrl.name.endsWith('[]')) as D;
	}

	getCustomData<D extends keyof C = keyof C>(customProperty: D) {
		return this.#service?.getData(customProperty) ?? null;
	}

	onChange<N extends keyof T & string = keyof T & string, D extends T[N] = T[N]>(
		name: `$${N}`,
		handler: (value: D) => void,
		runOnInit = true,
	): void {
		if (runOnInit) {
			handler(this.get(name));
		}
		for (const $ctrl of this.#findAll(name)) {
			$ctrl.addEventListener('change', () => {
				handler(this.get(name));
			});
		}
	}

	setCustomData<D extends keyof C = keyof C>(customProperty: D, value: C[D]) {
		this.#service?.setData(customProperty, value);
	}

	update<N extends keyof T & string = keyof T & string, D extends T[N] = T[N]>(
		name: `$${N}`,
		value:
			| D
			| ((value: D, el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => D),
	): void;
	update(
		data:
			| T
			| ((data: T, el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => T),
	): void;
	update<N extends keyof T & string = keyof T & string, D extends T[N] = T[N]>(
		nameOrData:
			| `$${N}`
			| T
			| ((data: T, el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => T),
		value?:
			| D
			| ((value: D, el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => D),
	): void {
		if (typeof nameOrData === 'string') {
			const name: `$${N}` = nameOrData;
			const $ctrlList = this.#findAll(name);
			for (const $ctrl of $ctrlList) {
				const newValue =
					typeof value === 'function' ? value(this.get(name), $ctrl) : value;
				setContent($ctrl, encodeItemPrimitiveData(newValue));
				return;
			}
			return;
		}
		const $ctrl = this.find(`[name="bge"]`);
		if (
			!$ctrl ||
			!($ctrl instanceof HTMLInputElement) ||
			!($ctrl instanceof HTMLTextAreaElement) ||
			!($ctrl instanceof HTMLSelectElement)
		) {
			return;
		}
		const newData =
			typeof nameOrData === 'function'
				? nameOrData(JSON.parse($ctrl.value || '{}'), $ctrl)
				: nameOrData;
		$ctrl.value = JSON.stringify(newData || {});
	}

	#extract() {
		const prefix = `${this.#corePrefix}-`;
		const $data = this.findAll<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>(`[name^="${prefix}"]`);

		const map = new Map<string, ItemPrimitiveData | ItemPrimitiveData[]>();

		for (const $datum of $data) {
			let name = camelCase($datum.name.slice(prefix.length));

			if (name.endsWith('[]')) {
				name = name.slice(0, -2);
				map.delete(name);
			}

			if (map.has(name)) {
				continue;
			}

			const value = this.get(`$${name}`);

			if ($datum instanceof HTMLInputElement) {
				switch ($datum.type) {
					case 'radio': {
						if ($datum.checked) {
							map.set(name, value);
						}
						continue;
					}
					case 'checkbox': {
						map.set(name, $datum.checked);
						continue;
					}
				}
			}

			map.set(name, value);
		}

		const data = Object.fromEntries(map);

		const $jsonData = this.find<HTMLInputElement>(`[name="${this.#corePrefix}"]`);

		if ($jsonData) {
			const jsonData = JSON.parse($jsonData.value || '{}');
			return {
				...jsonData,
				...data,
			};
		}

		return data;
	}

	#find<N extends keyof T & string = keyof T & string>(name: `$${N}`) {
		const el = this.#findAll(name)[0];
		if (el) {
			return el;
		}
		throw new Error(`Input element not found: ${name}`);
	}

	#findAll<N extends keyof T & string = keyof T & string>(
		name: `$${N}`,
	): (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[] {
		const propName = name.slice(1);
		let el: (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];
		for (const n of [kebabCase(propName), propName]) {
			el = this.findAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
				`[name="bge-${n}"], [name="bge-${n}[]"]`,
				'input, textarea, select',
			);
			if (el.length > 0) {
				return [...el];
			}
		}
		return [];
	}

	async #getContentStylesheet() {
		if (this.#contentStylesheetCache) {
			return this.#contentStylesheetCache;
		}
		const css = await Promise.all(
			this.engine.css.stylesheets
				.filter((sheet) => sheet.layer == null)
				.map(async (sheet) => {
					const res = await fetch(sheet.path);
					return res.text();
				}),
		);
		this.#contentStylesheetCache = css.join('\n');
		return this.#contentStylesheetCache;
	}

	#setValues(data: T) {
		for (const [_name, datum] of Object.entries(data)) {
			const name = kebabCase(_name);
			const inputSelector = `[name="bge-${name}"], [name="bge-${name}[]"]`;
			const value = encodeItemPrimitiveData(datum);
			for (const targetEl of this.findAll(inputSelector, 'input, textarea, select')) {
				setContent(targetEl, value);
			}
		}
		this.update(data);
	}

	override closed() {
		this.engine.componentObserver.off();
		super.closed();
	}

	override async complete(formData: FormData) {
		await this.#service?.item.import(this.#extract(), true);
		super.complete(formData);
	}

	override onSubmit(e: SubmitEvent, submitter: Submitter) {
		return this.#service?.onSubmit?.(e, submitter);
	}

	override async open(service: ItemEditorService<T, C>) {
		this.#service = service;
		const template = getItemEditorTemplate(this.engine, this.#service.item.name);
		if (!template) {
			throw new Error(`Template not found: ${this.#service.item.name}`);
		}

		this.setTemplate(...template);

		const containerType =
			this.#service.item.el.closest<HTMLDivElement>('[data-bge-container]')?.dataset
				.bgeContainer;

		this.el.dataset.bgeContainer = containerType;

		let data = this.#service.item.export();
		if (this.#service) {
			data = this.#service.beforeOpen(data, this);
		}
		this.#setValues(data);
		super.open();
		if (this.#service) {
			this.#setValues(data);

			const wysiwyg = this.find<BgeWysiwygEditorElement>('bge-wysiwyg-editor');
			if (wysiwyg) {
				const stylesheet = await this.#getContentStylesheet();
				wysiwyg.setStyle(stylesheet);
			}

			await this.#service.open(data, this);
		}
		this.engine.componentObserver.notify('open-editor', {
			data,
			editor: this as ItemEditorDialog<{}>,
		});
	}
}
