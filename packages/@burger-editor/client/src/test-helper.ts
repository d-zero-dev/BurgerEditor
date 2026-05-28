import type { VitestUtils } from 'vitest';

import fs from 'node:fs/promises';

import JQuery from 'jquery';

/**
 *
 * @param vi
 */
export function enableJQuery(vi: VitestUtils) {
	vi.stubGlobal('$', JQuery);
	vi.stubGlobal('jQuery', JQuery);
}

export const createElement = (html: string) => {
	const container = document.createElement('div');
	container.innerHTML = html;
	const el = container.children[0];
	if (!el) throw new Error('No element found');
	return el as HTMLElement;
};

/**
 *
 * @param typeName
 */
export async function readBurgerTypeTemplate(typeName: string) {
	const typeContent = await fs.readFile(`./Addon/type/${typeName}/value.php`, 'utf8');
	const typeVersionCode = await fs.readFile(
		`./Addon/type/${typeName}/version.php`,
		'utf8',
	);
	const typeVersion =
		(typeVersionCode.match(/\$version\s*=\s*(["'])(.+)\1/) || [])[2] || '';
	const typeTmpl = `
		<div data-bgt="${typeName}" data-bgt-ver="${typeVersion}" class="bgt-container bgt-${typeName}-container">
			${typeContent}
		</div>
	`;
	return createElement(typeTmpl);
}

/**
 *
 * @param typeName
 * @param typeDir
 */
export async function readBurgerType(
	typeName: string,
	typeDir = `./Addon/type/${typeName}/`,
) {
	const typeContent = await fs.readFile(`${typeDir}value.php`, 'utf8');
	const typeVersionCode = await fs.readFile(`${typeDir}version.php`, 'utf8');
	const version = (typeVersionCode.match(/\$version\s*=\s*(["'])(.+)\1/) || [])[2] || '';
	const tmpl = `
		<div data-bgt="${typeName}" data-bgt-ver="${version}" class="bgt-container bgt-${typeName}-container">
			${typeContent}
		</div>
	`;
	return {
		version,
		tmpl,
	};
}
