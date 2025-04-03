import button from './items/button/index.js';
import downloadFile from './items/download-file/index.js';
import googleMaps from './items/google-maps/index.js';
import hr from './items/hr/index.js';
import image from './items/image/index.js';
import table from './items/table/index.js';
import titleH2 from './items/title-h2/index.js';
import titleH3 from './items/title-h3/index.js';
import wysiwyg from './items/wysiwyg/index.js';
import youtube from './items/youtube/index.js';

export const items = {
	button,
	'download-file': downloadFile,
	'google-maps': googleMaps,
	hr,
	image,
	table,
	'title-h2': titleH2,
	'title-h3': titleH3,
	wysiwyg,
	youtube,
} as const;
