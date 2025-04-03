import { createItem } from '../../create-item.js';

import editor from './editor.html';
import style from './style.css';
import template from './template.html';

const ORIGIN = '__org';

export default createItem<{
	path: string;
	srcset: string;
	alt: string;
	width: number;
	height: number;
	cssWidth: `${number}px` | `${number}cqi`;
	style: string;
	scaleType: 'container' | 'original';
	scale: number;
	aspectRatio: `${number}/${number}` | 'unset';
	lazy: boolean;
	loading: 'eager' | 'lazy';
	decoding: 'sync' | 'async' | 'auto';
	caption: string;
	popup: boolean;
	node: 'div' | 'button' | 'a';
	href: string;
	target: '_blank' | null;
	targetBlank: boolean;
	command: 'show-modal' | null;
	fileSize: string;
}>({
	version: __VERSION__,
	name: 'image',
	template,
	style,
	editor,
	editorOptions: {
		beforeOpen(data) {
			const path = data.path.replace(ORIGIN, '');
			const lazy = data.loading === 'lazy';
			const popup = data.node === 'button' && data.command === 'show-modal';
			const targetBlank = data.node === 'a' && data.target === '_blank';
			return {
				...data,
				path,
				lazy,
				popup,
				targetBlank,
			};
		},
		open(data, editor) {
			editor.engine.componentObserver.notify('file-select', {
				path: data.path,
				fileSize: Number.parseFloat(data.fileSize ?? '0'),
				isEmpty: data.path === '',
				isMounted: false,
			});

			editor.engine.componentObserver.on('file-select', ({ path, isEmpty }) => {
				if (isEmpty) {
					return;
				}

				const { src, origin } = originImage(path);
				void Promise.all([loadImage(src), origin ? loadImage(origin) : null]).then(
					([$src, $origin]) => {
						if (!$src) {
							editor.update('$path', src);
							return;
						}

						if ($origin) {
							editor.update('$path', $origin.src);
							editor.update('$srcset', `${$src.src}, ${$origin.src} 2x`);
							editor.update('$width', $origin.width);
							editor.update('$height', $origin.height);
							updateCSSWidth();
							return;
						}

						editor.update('$path', $src.src);
						editor.update('$width', $src.width);
						editor.update('$height', $src.height);
						updateCSSWidth();
					},
				);
			});

			editor.onChange('$scale', updateCSSWidth);
			editor.onChange('$scaleType', updateCSSWidth);
			/**
			 *
			 */
			function updateCSSWidth() {
				const scale = editor.get('$scale');
				const width = editor.get('$width');
				const scaleType = editor.get('$scaleType');
				editor.update(
					'$cssWidth',
					scaleType === 'container'
						? `${scale}cqi`
						: `${Math.round((width * scale) / 100)}px`,
				);
			}

			editor.onChange('$popup', (disable) => {
				editor.disable('$href', disable);
				editor.disable('$targetBlank', disable);
			});
		},
		beforeChange(newData) {
			const loading = newData.lazy ? 'lazy' : 'eager';
			const node = newData.popup ? 'button' : newData.href ? 'a' : 'div';
			const target = node === 'a' && newData.targetBlank ? '_blank' : null;
			const command = node === 'button' ? 'show-modal' : null;
			const style =
				newData.scaleType === 'container'
					? //
						[
							//
							`--css-width: ${newData.cssWidth}`,
							'--object-fit: cover',
							`--aspect-ratio: ${newData.aspectRatio}`,
						].join(';')
					: //
						[
							//
							`--css-width: ${newData.cssWidth}`,
						].join(';');

			return {
				...newData,
				loading,
				node,
				target,
				command,
				style,
			};
		},
	},
});

/**
 *
 * @param src
 */
async function loadImage(src: string) {
	return new Promise<{
		width: number;
		height: number;
		src: string;
	} | null>((resolve, reject) => {
		const img = new Image();
		img.src = src;
		img.addEventListener('load', () =>
			resolve({
				width: img.naturalWidth,
				height: img.naturalHeight,
				src,
			}),
		);
		img.addEventListener('error', () => resolve(null));
		img.addEventListener('abort', () => resolve(null));

		setTimeout(() => {
			reject(new ReferenceError('Image load timeout'));
		}, 30_000);
	});
}

/**
 *
 * @param src
 */
function originImage(src: string) {
	const filePath = src.match(/^(.*)(\.(?:jpe?g|gif|png|webp))$/i);

	if (filePath) {
		const [, name, ext] = filePath;
		return {
			src,
			origin: `${name}${ORIGIN}${ext}`,
		};
	}
	return {
		src,
		origin: null,
	};
}
