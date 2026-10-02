import button from './button/definition.js';
import details from './details/definition.js';
import downloadFile from './download-file/definition.js';
import googleMaps from './google-maps/definition.js';
import hr from './hr/definition.js';
import image from './image/definition.js';
import importItem from './import/definition.js';
import table from './table/definition.js';
import titleH2 from './title-h2/definition.js';
import titleH3 from './title-h3/definition.js';
import wysiwyg from './wysiwyg/definition.js';
import youtube from './youtube/definition.js';

// 公開APIとしての説明は types.d.ts。ここはNode.jsから読まれるため、
// React・`@burger-editor/client` に依存するモジュールをimportしてはならない
// （ESLintの`no-restricted-imports`と`yarn verify:blocks-boundary`で検査する）
export const items = {
	button,
	details,
	'download-file': downloadFile,
	'google-maps': googleMaps,
	hr,
	image,
	import: importItem,
	table,
	'title-h2': titleH2,
	'title-h3': titleH3,
	wysiwyg,
	youtube,
} as const;
