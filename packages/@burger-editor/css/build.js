import fs from 'node:fs/promises';
import path from 'node:path';

import { glob } from 'glob';
import postcss from 'postcss';

const cssFileGlob = path.resolve('..', 'blocks', '**', '*.css');
const cssFiles = await glob(cssFileGlob);

/**
 * @type {string[]}
 */
const codes = [];

for (const cssFilePath of cssFiles) {
	const css = await fs.readFile(cssFilePath, 'utf8');
	codes.push(css);
}

const css = await postcss().process(codes.join('\n'), {
	from: undefined,
	to: undefined,
});

await fs.writeFile('style.css', css.css);
