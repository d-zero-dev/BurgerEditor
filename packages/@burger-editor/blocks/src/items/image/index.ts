import { createItem } from '../../create-item.js';

import editor from './editor.html';
import style from './style.css';
import template from './template.html';

const ORIGIN = '__org';

export default createItem<{
	// Images (Multiple)
	path: string[];
	alt: string[];
	width: number[];
	height: number[];
	media: string[];

	// Use in editor
	fileSize: string;
	mediaInput: string;
	// Styles
	style: string;
	cssWidth: `${number}px` | `${number}cqi`;
	scaleType: 'container' | 'original';
	scale: number;
	aspectRatio: `${number}/${number}` | 'unset';

	// Attributes
	lazy: boolean;
	loading: 'eager' | 'lazy';

	// Additional Data
	caption: string;
	altEditable: string;

	// Behavior
	node: 'div' | 'button' | 'a';
	href: string;
	popup: boolean;
	target: '_blank' | null;
	targetBlank: boolean;
	command: 'show-modal' | null;
}>({
	version: __VERSION__,
	name: 'image',
	template,
	style,
	editor,
	editorOptions: {
		beforeOpen(data) {
			const path = data.path.map((p) => p.replace(ORIGIN, ''));
			const lazy = data.loading === 'lazy';
			const popup = data.node === 'button' && data.command === 'show-modal';
			const targetBlank = data.node === 'a' && data.target === '_blank';
			return {
				...data,
				path,
				lazy,
				popup,
				targetBlank,
				altEditable: data.alt?.[0] ?? '',
			};
		},
		open(_, editor) {
			let currentIndex = 0;

			selectTab(currentIndex);

			/**
			 *
			 */
			function fileSelect() {
				const $path = editor.get('$path');
				const currentPath = $path[currentIndex] ?? $path[0];

				if (!currentPath) {
					throw new Error('currentPath is not found');
				}

				editor.engine.componentObserver.notify('file-select', {
					path: currentPath,
					fileSize: Number.parseFloat(editor.get('$fileSize') ?? '0'),
					isEmpty: currentPath === '',
					isMounted: false,
				});
			}

			/**
			 *
			 * @param index
			 */
			function selectTab(index: number) {
				currentIndex = index;
				fileSelect();
				void _updateImage(editor.get('$path')[currentIndex]!);

				editor.disable('$mediaInput', currentIndex === 0);

				const media = editor.get('$media')[currentIndex] ?? '';
				editor.update('$mediaInput', media);
			}

			editor.engine.componentObserver.on('file-select', ({ path, isEmpty }) => {
				if (isEmpty) {
					return;
				}

				void _updateImage(path);
			});

			/**
			 *
			 * @param path
			 */
			async function _updateImage(path: string) {
				const $src = await loadImage(path);

				updateImage($src);
			}

			/**
			 *
			 * @param $src
			 */
			function updateImage($src: ImageData) {
				if (!$src) {
					// eslint-disable-next-line no-console
					console.error('画像の読み込みに失敗しました');
					return;
				}

				const path = [...editor.get('$path')];
				path[currentIndex] = $src.src;
				editor.update('$path', path);

				const width = [...editor.get('$width')];
				width[currentIndex] = $src.width;
				editor.update('$width', width);

				const height = [...editor.get('$height')];
				height[currentIndex] = $src.height;
				editor.update('$height', height);

				const media = [...editor.get('$media')];
				media[currentIndex] = editor.get('$mediaInput');
				editor.update('$media', media);

				updateCSSWidth();
			}

			editor.engine.componentObserver.on('select-tab-in-item-editor', ({ index }) => {
				selectTab(index);
			});

			editor.onChange('$scale', updateCSSWidth);
			editor.onChange('$scaleType', updateCSSWidth);

			editor.onChange('$mediaInput', (value) => {
				const media = [...editor.get('$media')];
				media[currentIndex] = value;
				editor.update('$media', media);
			});

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
						: // TODO: 複数画像の場合は、最初の画像の幅を使用するか、それともすべての画像の幅を使用するか検討
							`${Math.round((width[0]! * scale) / 100)}px`,
				);
			}

			editor.onChange('$popup', (disable) => {
				editor.disable('$href', disable);
				editor.disable('$targetBlank', disable);
			});

			editor.onChange('$altEditable', (value) => {
				const alt = [...editor.get('$alt')];
				alt[currentIndex] = value;
				editor.update('$alt', alt);
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

type ImageData = {
	width: number;
	height: number;
	src: string;
} | null;

/**
 *
 * @param src
 */
async function loadImage(src: string) {
	return new Promise<ImageData>((resolve, reject) => {
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

// /**
//  *
//  * @param src
//  */
// function originImage(src: string) {
// 	const filePath = src.match(/^(.*)(\.(?:jpe?g|gif|png|webp))$/i);

// 	if (filePath) {
// 		const [, name, ext] = filePath;
// 		return {
// 			src,
// 			origin: `${name}${ORIGIN}${ext}`,
// 		};
// 	}
// 	return {
// 		src,
// 		origin: null,
// 	};
// }
