import { FrozenPattyData } from './frozen-patty';
import './polyfill';
export declare function toJSON(el: HTMLElement, attr: string): FrozenPattyData;
/**
 *
 * @param el HTMLElement
 * @param attr Data attribute name for specifying the node that FrozenPatty treats as a field.
 */
export declare function extractor(el: HTMLElement, attr: string): [string, string | number | boolean, boolean][];
