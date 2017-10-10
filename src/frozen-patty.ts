import { imports } from './imports';
import { toJSON } from './toJSON';

export default class FrozenPatty {

	private _dom: HTMLElement;
	private _attr = 'field';

	/**
	 *
	 * @param html Original HTML
	 * @param options Options
	 */
	constructor (html: string, options?: FrozenPattyOptions) {
		this._dom = document.createElement('fp-placeholer');
		this._dom.innerHTML = html;
		if (options && options.attr) {
			this._attr = options.attr;
		}
	}

	public merge (data: FrozenPattyData) {
		const currentData = this.toJSON();
		const newData = Object.assign(currentData, data);
		this._dom = imports(this._dom, newData, this._attr);
		return this;
	}

	public toJSON () {
		return toJSON(this._dom, this._attr);
	}

	public toHTML () {
		return this._dom.innerHTML;
	}

	public toDOM () {
		return this._dom;
	}
}

export interface FrozenPattyOptions {
	/**
	 * **Data attribute** name for specifying the node that FrozenPatty treats as a _field_
	 */
	attr?: string;
}

export interface FrozenPattyData {
	[filed: string]: PrimitiveData;
}

export type PrimitiveDatum = string | number | boolean;

export type PrimitiveData = PrimitiveDatum | PrimitiveDatum[];
