import get from './get';
import set from './set';

export default class FrozenPatty {

	private _dom: Element;
	private _attr = 'field';
	private _typeConvert = false;

	/**
	 * Value filter
	 */
	private _filter?: Filter;

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
			this._filter = options.valueFilter;
		}
	}

	public merge (data: FrozenPattyData) {
		const currentData = this.toJSON();
		const newData = Object.assign(currentData, data);
		this._dom = set(this._dom, newData, this._attr, this._typeConvert, this._filter);
		return this;
	}

	public toJSON (): FrozenPattyData {
		return get(this._dom, this._attr, this._typeConvert, this._filter);
	}

	public toHTML (): string {
		return this._dom.innerHTML;
	}

	public toDOM (): Element {
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

	/**
	 * Value filter
	 */
	// tslint:disable-next-line:prefer-method-signature
	valueFilter?: Filter;
}

export interface FrozenPattyData {
	[filed: string]: PrimitiveData;
}

export type PrimitiveDatum = string | number | boolean | null | undefined;

export type PrimitiveData = PrimitiveDatum | PrimitiveDatum[];

export type Filter = <T>(value: T) => T;
