import path from 'node:path';

/**
 *
 * @param fileName
 */
export function parseName(fileName: string) {
	const ext = path.extname(fileName);
	const basename = path.basename(fileName, ext);

	const [_fileId, _encodedName = '', size = ''] = basename.split('__');
	let fileId = _fileId;
	let encodedName = _encodedName;
	const id = Number.parseInt(fileId ?? '');

	if (Number.isNaN(id)) {
		fileId = 'N/A';
		encodedName = fileId;
	}

	const name = decode(encodedName);

	return {
		fileId,
		name,
		size,
		ext,
	};
}

/**
 *
 * @param str
 */
export function decode(str: string): string {
	str = str.replace(/-d-$/, '.');
	str = str.replaceAll('-D-', '..');
	str = str.replaceAll('_', '+').replaceAll('-', '/').replaceAll('.', '=');
	return Buffer.from(str, 'base64').toString();
}

/**
 *
 * @param str
 */
export function encode(str: string): string {
	return Buffer.from(str)
		.toString('base64')
		.replaceAll('+', '_')
		.replaceAll('/', '-')
		.replaceAll('=', '.')
		.replaceAll('..', '-D-')
		.replaceAll(/\.$/g, '-d-');
}
