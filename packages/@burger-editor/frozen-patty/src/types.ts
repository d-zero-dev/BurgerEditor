export interface FrozenPattyData {
	[filed: string]: PrimitiveData;
}

export type PrimitiveDatum = string | number | boolean | null | undefined;

export type PrimitiveData = PrimitiveDatum | PrimitiveDatum[];

export type Filter = <T>(value: T) => T;
