import type { Config } from '@burger-editor/core';

/**
 * 意味ない。たぶんそれぞれのプラットフォームでConfigの型が違うから。
 * @deprecated
 * @param urlOrScriptElement
 * @returns
 */
export async function getConfig(urlOrScriptElement: string): Promise<Config>;
export async function getConfig(urlOrScriptElement: HTMLScriptElement): Promise<Config>;
/**
 *
 * @param urlOrScriptElement
 */
export async function getConfig(
	urlOrScriptElement: string | HTMLScriptElement,
): Promise<Config> {
	let config: Config;
	if (typeof urlOrScriptElement === 'string') {
		config = await fetchConfig(urlOrScriptElement);
	} else {
		config = getConfigByScriptElement(urlOrScriptElement);
	}
	return config;
}

/**
 *
 * @param url
 */
async function fetchConfig(url: string): Promise<Config> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch configuration JSON. ${response.statusText}`);
	}
	const config = await response.text();
	return parseConfig(config);
}

/**
 *
 * @param scriptElement
 */
function getConfigByScriptElement(scriptElement: HTMLScriptElement): Config {
	if (!scriptElement) {
		throw new Error('Configuration JSON from the script element is not found.');
	}
	const json = scriptElement.textContent ?? '';
	return parseConfig(json);
}

/**
 *
 * @param config
 */
function parseConfig(config: string): Config {
	try {
		const json = JSON.parse(config);
		// eslint-disable-next-line no-console
		console.info('success: Configuration JSON is parsed.');
		return json;
	} catch {
		throw new SyntaxError('parse error: Configuration JSON.');
	}
}
