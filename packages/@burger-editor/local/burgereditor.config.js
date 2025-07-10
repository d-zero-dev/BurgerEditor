import path from 'node:path';

import { config } from 'dotenv';

config();

/**
 * @type {import('@burger-editor/local').LocalServerConfig}
 */
export default {
	documentRoot: path.join(import.meta.dirname, '.test'),
	lang: 'ja',
	// stylesheets: ['/css/style.css'],
	classList: ['custom-class-bge-local'],
	editableArea: '.custom-class-bge-local',
	googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
	sampleImagePath: '/files/images/sample.png',
	filesDir: {
		image: '/files/images',
		other: '/files/others',
	},
	open: true,
};
