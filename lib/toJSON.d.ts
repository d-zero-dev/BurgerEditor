import { FrozenPattyData } from './frozen-patty';
import './polyfill';
export declare function toJSON(el: Element, attr: string, typeConvert: boolean): FrozenPattyData;
/**
 *
 * @param el HTMLElement
 * @param attr Data attribute name for specifying the node that FrozenPatty treats as a field.
 */
export declare function extractor(el: Element, attr: string, typeConvert: boolean): [string, string | number | boolean | null | undefined, boolean][];
