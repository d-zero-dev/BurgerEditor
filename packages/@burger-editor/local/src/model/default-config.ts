import type { Config } from '@burger-editor/core';

export const defaultConfig = {
	classList: [],
	stylesheets: [],
	sampleImagePath: '',
	sampleFilePath: '',
	googleMapsApiKey: null,
} as const satisfies Config;
