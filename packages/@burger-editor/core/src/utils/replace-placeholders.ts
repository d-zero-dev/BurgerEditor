import type { Config } from '../types.js';

/**
 * テンプレート文字列のプレースホルダーを設定値で置換する
 * @param template
 * @param config
 */
export function replacePlaceholders(template: string, config: Config): string {
	return template
		.replaceAll('%sampleImagePath%', config.sampleImagePath)
		.replaceAll('%sampleFilePath%', config.sampleFilePath)
		.replaceAll('%googleMapsApiKey%', config.googleMapsApiKey ?? '');
}
