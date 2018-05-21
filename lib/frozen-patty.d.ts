export default class FrozenPatty {
    private _dom;
    private _attr;
    private _typeConvert;
    /**
     * Value filter
     */
    private _filter?;
    /**
     *
     * @param html Original HTML
     * @param options Options
     */
    constructor(html: string, options?: FrozenPattyOptions);
    merge(data: FrozenPattyData): this;
    toJSON(filtering?: boolean): FrozenPattyData;
    toHTML(): string;
    toDOM(): Element;
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
    valueFilter?: Filter;
}
export interface FrozenPattyData {
    [filed: string]: PrimitiveData;
}
export declare type PrimitiveDatum = string | number | boolean | null | undefined;
export declare type PrimitiveData = PrimitiveDatum | PrimitiveDatum[];
export declare type Filter = <T>(value: T) => T;
