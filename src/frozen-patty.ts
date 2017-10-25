import { imports } from './imports';
import { toJSON } from './toJSON';

export default class FrozenPatty {

	private _dom: HTMLElement;
	private _attr = 'field';
	private _typeConvert = false;

	/**
	 *
	 * @param html Original HTML
	 * @param options Options
	 */
	constructor (html: string, options?: FrozenPattyOptions) {
		this._dom = document.createElement('fp-placeholer');
		this._dom.innerHTML = html;
		if (options) {
			if (options.attr) {
				this._attr = options.attr;
			}
			this._typeConvert = !!options.typeConvert;
		}
	}

	public merge (data: FrozenPattyData) {
		const currentData = this.toJSON();
		const newData = Object.assign(currentData, data);
		this._dom = imports(this._dom, newData, this._attr, this._typeConvert);
		return this;
	}

	public toJSON () {
		return toJSON(this._dom, this._attr, this._typeConvert);
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
	 *
	 * @default `"field"`
	 */
	attr?: string;

	/**
	 * Auto type convertion that value of data attributes
	 *
	 * - `"true"` => `true`
	 * - `"false"` => `false`
	 * - `"0"` => `0`
	 * - `"1"` => `1`
	 * - `"1.0"` => `1`
	 * - `"0.1"` => `0.1`
	 *
	 * @default `false`
	 */
	typeConvert?: boolean;
}

export interface FrozenPattyData {
	[filed: string]: PrimitiveData;
}

export type PrimitiveDatum = string | number | boolean;

export type PrimitiveData = PrimitiveDatum | PrimitiveDatum[];
