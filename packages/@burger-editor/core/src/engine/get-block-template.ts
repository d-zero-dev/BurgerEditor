import { strToDOM } from '@burger-editor/utils';

/**
 *
 * @param defaultBlocks
 * @param name
 */
export function getBlockTemplate(
	defaultBlocks: ReadonlyMap<string, string>,
	name: string,
) {
	const html = defaultBlocks.get(name);
	if (html) {
		const dom = strToDOM(html);
		dom.dataset.bgeName = name;
		return dom;
	}
	throw new Error(`Do not get BurgerBlock template. "${name}" block is not exist.`);
}
