import button from './blocks/button/index.js';
import button2 from './blocks/button2/index.js';
import button3 from './blocks/button3/index.js';
import downloadFile from './blocks/download-file/index.js';
import downloadFile2 from './blocks/download-file2/index.js';
import downloadFile3 from './blocks/download-file3/index.js';
import googleMaps from './blocks/google-maps/index.js';
import hr from './blocks/hr/index.js';
import image from './blocks/image/index.js';
import imageText2 from './blocks/image-text2/index.js';
import imageText3 from './blocks/image-text3/index.js';
import imageText4 from './blocks/image-text4/index.js';
import imageText5 from './blocks/image-text5/index.js';
import image2 from './blocks/image2/index.js';
import image3 from './blocks/image3/index.js';
import image4 from './blocks/image4/index.js';
import image5 from './blocks/image5/index.js';
import table from './blocks/table/index.js';
import textFloatImage1 from './blocks/text-float-image1/index.js';
import textFloatImage2 from './blocks/text-float-image2/index.js';
import textImage1 from './blocks/text-image1/index.js';
import textImage2 from './blocks/text-image2/index.js';
import title from './blocks/title/index.js';
import title2 from './blocks/title2/index.js';
import wysiwyg from './blocks/wysiwyg/index.js';
import wysiwyg2 from './blocks/wysiwyg2/index.js';
import youtube from './blocks/youtube/index.js';

export const blocks = {
	button,
	button2,
	button3,
	'download-file': downloadFile,
	'download-file2': downloadFile2,
	'download-file3': downloadFile3,
	'google-maps': googleMaps,
	hr,
	image,
	'image-text2': imageText2,
	'image-text3': imageText3,
	'image-text4': imageText4,
	'image-text5': imageText5,
	image2,
	image3,
	image4,
	image5,
	table,
	'text-float-image1': textFloatImage1,
	'text-float-image2': textFloatImage2,
	'text-image1': textImage1,
	'text-image2': textImage2,
	title,
	title2,
	wysiwyg,
	wysiwyg2,
	youtube,
} as const;
