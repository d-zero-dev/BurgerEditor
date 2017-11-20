import { Filter, FrozenPattyData, PrimitiveDatum } from './frozen-patty';
/**
 * Set value to an element
 *
 * ```html
 * <div [target-attribute] data-[attr]="[name]:[target-attribute]"></div>
 * ```
 *
 * @param name A label name
 * @param datum A datum of value
 * @param el A target element
 * @param attr Field data attribute name
 */
export default function (name: keyof FrozenPattyData, datum: PrimitiveDatum, el: Element, attr: string, filter?: Filter): void;
