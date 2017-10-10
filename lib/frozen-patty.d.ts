export default class FrozenPatty {
    private _dom;
    private _attr;
    /**
     *
     * @param html Original HTML
     * @param options Options
     */
    constructor(html: string, options?: FrozenPattyOptions);
    merge(data: FrozenPattyData): this;
    toJSON(): FrozenPattyData;
    toHTML(): string;
    toDOM(): HTMLElement;
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
export declare type PrimitiveDatum = string | number | boolean;
export declare type PrimitiveData = PrimitiveDatum | PrimitiveDatum[];
