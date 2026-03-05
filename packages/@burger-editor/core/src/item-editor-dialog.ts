import type { ComponentObserver } from './component-observer.js';
import type { Submitter } from './dom-helpers/types.js';
import type { DialogSettings } from './editor-dialog.js';
import type { ItemEditorService } from './item/item-editor-service.js';
import type { ItemData, ItemPrimitiveData } from './item/types.js';
import type { Config } from './types.js';
import type { BgeWysiwygEditorElement } from '@burger-editor/custom-element';

import { setContent } from '@burger-editor/frozen-patty/set-value';
import { camelCase, kebabCase } from '@burger-editor/utils';

import { EditorDialog } from './editor-dialog.js';
import { decodeItemPrimitiveData } from './utils/decode-item-primitive-data.js';
import { encodeItemPrimitiveData } from './utils/encode-item-primitive-data.js';

export interface ItemEditorDialogSettings<
	T extends ItemData,
	C extends { [key: string]: unknown } = {},
> extends DialogSettings {
	config: Config;
	onOpened: (data: T, editor: ItemEditorDialog<T, C>) => Promise<void> | void;
	getComponentObserver: () => ComponentObserver;
	getTemplate: (itemName: string) => HTMLCollection | null;
	getContentStylesheet: () => Promise<string>;
}

export class ItemEditorDialog<
	T extends ItemData,
	C extends { [key: string]: unknown } = {},
> extends EditorDialog {
	readonly config: Config;
	#componentObserver: () => ComponentObserver;
	readonly #corePrefix = 'bge';

	#getContentStylesheet: () => Promise<string>;
	#getTemplate: (itemName: string) => HTMLCollection | null;
	#onOpened: (data: T, editor: ItemEditorDialog<T, C>) => Promise<void> | void;

	#service?: ItemEditorService<T, C>;
	#values = new Map<string, unknown | null>();

	get componentObserver() {
		return this.#componentObserver();
	}

	constructor(settings: ItemEditorDialogSettings<T, C>) {
		super('item-editor', settings, {
			buttons: {
				close: 'キャンセル',
				complete: '決定',
			},
		});

		this.config = settings.config;
		this.#componentObserver = settings.getComponentObserver;
		this.#onOpened = settings.onOpened;
		this.#getTemplate = settings.getTemplate;
		this.#getContentStylesheet = settings.getContentStylesheet;
	}

	disable<N extends keyof T & string = keyof T & string>(name: `$${N}`, disabled = true) {
		for (const $ctrl of this.#findAll(name)) {
			if ($ctrl instanceof HTMLOutputElement) {
				// HTMLOutputElement does not support disabled property
				continue;
			}
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

	max<N extends keyof T & string = keyof T & string>(name: `$${N}`, value: number) {
		const $ctrl = this.#find(name);
		if ($ctrl instanceof HTMLInputElement) {
			$ctrl.max = value.toString();
		}
	}

	onChange<N extends keyof T & string = keyof T & string, D extends T[N] = T[N]>(
		name: `$${N}`,
		handler: (value: D, oldValue: D | null) => void,
		runOnInit = true,
	): void {
		if (runOnInit) {
			handler(this.get(name), null);
		}
		for (const $ctrl of this.#findAll(name)) {
			$ctrl.addEventListener('change', () => {
				const oldValue = (this.#values.get(name) as D) ?? null;
				const value: D = this.get(name);
				this.#values.set(name, value);
				if (oldValue === value) {
					return;
				}
				handler(value, oldValue);
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
			| ((
					value: D,
					el:
						| HTMLInputElement
						| HTMLTextAreaElement
						| HTMLSelectElement
						| HTMLOutputElement,
			  ) => D),
	): void;
	update(
		data:
			| T
			| ((
					data: T,
					el:
						| HTMLInputElement
						| HTMLTextAreaElement
						| HTMLSelectElement
						| HTMLOutputElement,
			  ) => T),
	): void;
	update<N extends keyof T & string = keyof T & string, D extends T[N] = T[N]>(
		nameOrData:
			| `$${N}`
			| T
			| ((
					data: T,
					el:
						| HTMLInputElement
						| HTMLTextAreaElement
						| HTMLSelectElement
						| HTMLOutputElement,
			  ) => T),
		value?:
			| D
			| ((
					value: D,
					el:
						| HTMLInputElement
						| HTMLTextAreaElement
						| HTMLSelectElement
						| HTMLOutputElement,
			  ) => D),
	): void {
		if (typeof nameOrData === 'string') {
			const name: `$${N}` = nameOrData;
			const $ctrlList = this.#findAll(name);
			for (const $ctrl of $ctrlList) {
				const newValue =
					typeof value === 'function' ? value(this.get(name), $ctrl) : value;
				if (
					$ctrl instanceof HTMLInputElement &&
					($ctrl.type === 'radio' || $ctrl.type === 'checkbox')
				) {
					if ($ctrl.type === 'checkbox') {
						$ctrl.checked = !!newValue;
						continue;
					}
					if ($ctrl.value === newValue) {
						$ctrl.checked = true;
						continue;
					}
					$ctrl.checked = false;
					continue;
				}
				setContent($ctrl, encodeItemPrimitiveData(newValue));
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

		if (__DEBUG__) {
			// eslint-disable-next-line no-console
			console.log(data);
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
	): (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLOutputElement)[] {
		const propName = name.slice(1);
		let el: (
			| HTMLInputElement
			| HTMLTextAreaElement
			| HTMLSelectElement
			| HTMLOutputElement
		)[];
		for (const n of [kebabCase(propName), propName]) {
			el = this.findAll<
				HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLOutputElement
			>(`[name="bge-${n}"], [name="bge-${n}[]"]`, 'input, textarea, select, output');
			if (el.length > 0) {
				return [...el];
			}
		}
		return [];
	}

	#setValues(data: T) {
		for (const [_name, datum] of Object.entries(data)) {
			const name = kebabCase(_name);
			const inputSelector = `[name="bge-${name}"], [name="bge-${name}[]"]`;
			const value = encodeItemPrimitiveData(datum);
			for (const targetEl of this.findAll(
				inputSelector,
				'input, textarea, select, output',
			)) {
				setContent(targetEl, value);
			}
		}
		this.update(data);
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
		this.clearTemplate();
		const template = this.#getTemplate(this.#service.item.name);
		if (!template) {
			alert(
				`編集できないコンテンツです (Error: Editor template not found: "${this.#service.item.name}")`,
			);
			return;
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
		await this.#onOpened(data, this);
	}
}
