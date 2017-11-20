import { FrozenPattyData, PrimitiveDatum } from './frozen-patty';
/**
 *
 */
export declare function arrayToHash(kvs: [keyof FrozenPattyData, PrimitiveDatum, boolean][]): {
    [index: string]: string | number | boolean | PrimitiveDatum[] | null | undefined;
};
