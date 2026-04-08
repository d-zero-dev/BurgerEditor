import button from './button/index.js';
import details from './details/index.js';
import downloadFile from './download-file/index.js';
import googleMaps from './google-maps/index.js';
import hr from './hr/index.js';
import image from './image/index.js';
import importItem from './import/index.js';
import table from './table/index.js';
import titleH2 from './title-h2/index.js';
import titleH3 from './title-h3/index.js';
import wysiwyg from './wysiwyg/index.js';
import youtube from './youtube/index.js';

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
