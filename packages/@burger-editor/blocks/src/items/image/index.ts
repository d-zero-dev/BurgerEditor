import { createItem } from '@burger-editor/core';

import editor from './editor.html';
import style from './style.css';
import template from './template.html';
import { createWidthState } from './width.js';

const ORIGIN = '__org';

export default createItem<{
	// Images (Multiple)
	path: string[];
	alt: string[];
	width: number[];
	height: number[];
	media: string[];
	loading: ('eager' | 'lazy')[];

	// Use in editor
	fileSize: string;
	mediaInput: string;
	// Styles
	style: string;
	cssWidth: `${number}px` | `${number}cqi`;
	scaleType: 'container' | 'original';
	scale: number;
	aspectRatio: `${number}/${number}` | 'unset';

	// Editor Display
	cssWidthNumber: number;
	cssWidthUnit: 'px' | 'cqi';

	// Attributes
	lazy: boolean;

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
			const path = (data.path ?? []).map((p) => p.replace(ORIGIN, ''));
			const lazy = (data.loading ?? []).includes('lazy');
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
		open(initData, editor) {
			let currentIndex = 0;
			const widthState = createWidthState();

			// Initialize width state
			widthState.setScaleType(initData.scaleType);
			widthState.setScale(initData.scale);
			widthState.setMaxNumber(initData.width[0] ?? 400);
			updateCSSWidth();

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

				editor.componentObserver.notify('file-select', {
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

			editor.componentObserver.on('file-select', ({ path, isEmpty }) => {
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
				if (!path) {
					return;
				}

				const $src = await loadImage(path);

				updateImage($src);
			}

			editor.componentObserver.on('select-tab-in-item-editor', ({ index }) => {
				selectTab(index);
			});

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

				// Update max number
				widthState.setMaxNumber($src.width);

				updateCSSWidth();
			}
			editor.onChange(
				'$cssWidthNumber',
				(widthNumber) => {
					widthState.setNumber(widthNumber);
					updateCSSWidth();
				},
				false,
			);

			editor.onChange(
				'$scaleType',
				(scaleType) => {
					widthState.setScaleType(scaleType);

					updateCSSWidth();
				},
				false,
			);

			editor.onChange(
				'$scale',
				(scale) => {
					widthState.setScale(scale);
					updateCSSWidth();
				},
				false,
			);

			editor.onChange('$mediaInput', (value) => {
				const media = [...editor.get('$media')];
				media[currentIndex] = value;
				editor.update('$media', media);
			});

			/**
			 *
			 */
			function updateCSSWidth() {
				// console.log(widthState.debug());
				editor.max('$cssWidthNumber', widthState.getCSSWidthMaxNumber());
				editor.update('$cssWidthUnit', widthState.getCSSWidthUnit());
				editor.update('$cssWidthNumber', widthState.getCSSWidthNumber());
				editor.update('$scaleType', widthState.getScaleType());
				editor.update('$scale', widthState.getScale());
				editor.update('$cssWidth', widthState.getCSSWidth());

				editor.componentObserver.notify('update-css-width', {
					cssWidth: widthState.getCSSWidth(),
				});
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
			const loading: ('eager' | 'lazy')[] = [newData.lazy ? 'lazy' : 'eager'];
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
