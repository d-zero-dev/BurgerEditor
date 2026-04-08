export interface FrozenPattyData {
	[filed: string]: PrimitiveData;
}

export interface FrozenPattyFlattenData {
	[field: string]: PrimitiveDatum;
}

export interface FieldDefinition {
	fieldName: string;
	propName?: string;
}

export type PrimitiveDatum = string | number | boolean | null | undefined;

export type PrimitiveData = PrimitiveDatum | PrimitiveDatum[];

export type Filter = <T>(value: T) => T;
