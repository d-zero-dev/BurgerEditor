import { createItem } from '@burger-editor/core';

import { ImageEditor } from './editor.js';
import style from './style.css';
import template from './template.html';

const ORIGIN = '__org';

export type ImageData = {
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
	aspectRatio: `${number}/${number}` | 'revert';

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
};

export default createItem<ImageData>({
	version: __VERSION__,
	name: 'image',
	template,
	style,
	toEditorState(data) {
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
	toItemData(state) {
		const loading: ('eager' | 'lazy')[] = [state.lazy ? 'lazy' : 'eager'];
		const node = state.popup ? 'button' : state.href ? 'a' : 'div';
		const target = node === 'a' && state.targetBlank ? '_blank' : null;
		const command = node === 'button' ? 'show-modal' : null;
		const styleValue =
			state.scaleType === 'container'
				? //
					[
						//
						`--css-width: ${state.cssWidth}`,
						'--object-fit: cover',
						`--aspect-ratio: ${state.aspectRatio}`,
					].join(';')
				: //
					[
						//
						`--css-width: ${state.cssWidth}`,
					].join(';');

		return {
			...state,
			loading,
			node,
			target,
			command,
			style: styleValue,
		};
	},
	Editor: ImageEditor,
});
