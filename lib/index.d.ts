import FrozenPatty, { Filter, FrozenPattyOptions, PrimitiveDatum } from './frozen-patty';
/**
 * Pure HTML to JSON converter that not use template engine.
 *
 * @param html Original HTML
 * @param options Options
 */
declare function frozenPatty(html: string, options?: FrozenPattyOptions): FrozenPatty;
declare namespace frozenPatty {
    /**
     * Set value to an element
     *
     * ```html
     * <div [target-attribute] data-[attr]="[name]:[target-attribute]"></div>
     * ```
     *
     * @param el A target element
     * @param name A label name
     * @param datum A datum of value
     * @param attr Data attribute name for specifying the node that FrozenPatty treats as a field
     */
    function setValue(el: Element, name: string, datum: PrimitiveDatum, attr?: string, filter?: Filter): void;
    /**
     * Get value from an element
     *
     * @param el A target element
     * @param name A label name
     * @param typeConvert Auto covert type of value
     * @param attr Data attribute name for specifying the node that FrozenPatty treats as a field
     */
    function getValue(el: Element, name: string, typeConvert?: boolean, attr?: string, filter?: Filter): string | number | boolean | PrimitiveDatum[] | null | undefined;
}
export default frozenPatty;
