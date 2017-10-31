/**
 *
 */
export declare function arrayToHash<T, K extends string>(kvs: [K, T, boolean][]): {
    [P in K]: T | T[];
};
