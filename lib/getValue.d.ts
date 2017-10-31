import { PrimitiveDatum } from './frozen-patty';
/**
 * Get value from an element
 *
 * @param el HTMLElement
 * @param attr Data attribute name for specifying the node that FrozenPatty treats as a field
 * @param typeConvert Auto covert type of value
 */
export default function (el: Element, attr: string, typeConvert: boolean): [string, PrimitiveDatum, boolean][];
