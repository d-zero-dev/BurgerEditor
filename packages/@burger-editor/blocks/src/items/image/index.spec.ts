import { ComponentObserver, ItemEditorDialog } from '@burger-editor/core';
import { test, expect, describe, beforeEach } from 'vitest';

import imageItem from './index.js';

type ImageItemData = typeof imageItem._;

/**
 *
 */
function createEditor() {
	const editor = new ItemEditorDialog<ImageItemData>({
		config: {
			classList: [],
			googleMapsApiKey: null,
			sampleImagePath: '/img/sample.png',
			sampleFilePath: '/pdf/sample.pdf',
			stylesheets: [],
		},
		onClosed: () => {},
		onOpen: () => false,
		createEditorComponent: () => {},
		onOpened: () => {},
		getComponentObserver: () => new ComponentObserver(),
		getTemplate: () =>
			document.createRange().createContextualFragment(imageItem.template).children,
		getContentStylesheet: () => Promise.resolve(''),
	});

	return editor;
}

describe('image item', () => {
	let editor: ItemEditorDialog<ImageItemData>;

	beforeEach(() => {
		// Clean up the document body
		document.body.innerHTML = '';

		editor = createEditor();
	});

	describe('beforeOpen関数', () => {
		test('pathの__org置換', () => {
			const data = {
				path: ['/path/to/image__org.jpg', '/path/to/image2__org.png'],
				alt: ['alt1', 'alt2'],
				width: [100, 200],
				height: [50, 100],
				media: ['', ''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'unset',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = imageItem.editorOptions?.beforeOpen?.(data, editor);

			expect(result?.path).toEqual(['/path/to/image.jpg', '/path/to/image2.png']);
		});

		test('loadingからlazyへの変換', () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['alt1'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'unset',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['lazy'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = imageItem.editorOptions?.beforeOpen?.(data, editor);

			expect(result?.lazy).toBe(true);
		});

		test('nodeとcommandからpopupへの変換', () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['alt1'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'unset',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'button',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: 'show-modal',
			} as const satisfies Readonly<ImageItemData>;

			const result = imageItem.editorOptions?.beforeOpen?.(data, editor);

			expect(result?.popup).toBe(true);
		});

		test('nodeとtargetからtargetBlankへの変換', () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['alt1'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'unset',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'a',
				href: 'https://example.com',
				popup: false,
				target: '_blank',
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = imageItem.editorOptions?.beforeOpen?.(data, editor);

			expect(result?.targetBlank).toBe(true);
		});

		test('altからaltEditableへの変換', () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['test alt text'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'unset',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = imageItem.editorOptions?.beforeOpen?.(data, editor);

			expect(result?.altEditable).toBe('test alt text');
		});

		test('altが空の場合、altEditableは空文字', () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: [],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'unset',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = imageItem.editorOptions?.beforeOpen?.(data, editor);

			expect(result?.altEditable).toBe('');
		});
	});

	describe('beforeChange関数', () => {
		test('lazyからloadingへの変換', async () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['alt1'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'unset',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: true,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = await imageItem.editorOptions?.beforeChange?.(data, editor);

			expect(result?.loading).toStrictEqual(['lazy']);
		});

		test('popupからnodeとcommandへの変換', async () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['alt1'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'unset',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: true,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = await imageItem.editorOptions?.beforeChange?.(data, editor);

			expect(result?.node).toBe('button');
			expect(result?.command).toBe('show-modal');
		});

		test('hrefとtargetBlankからnodeとtargetへの変換', async () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['alt1'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '100px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'unset',
				cssWidthNumber: 100,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: 'https://example.com',
				popup: false,
				target: null,
				targetBlank: true,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = await imageItem.editorOptions?.beforeChange?.(data, editor);

			expect(result?.node).toBe('a');
			expect(result?.target).toBe('_blank');
		});

		test('scaleType=containerの場合のstyle生成', async () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['alt1'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '80cqi',
				scaleType: 'container',
				scale: 80,
				aspectRatio: '16/9',
				cssWidthNumber: 80,
				cssWidthUnit: 'cqi',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = await imageItem.editorOptions?.beforeChange?.(data, editor);

			expect(result?.style).toContain('--css-width: 80cqi');
			expect(result?.style).toContain('--object-fit: cover');
			expect(result?.style).toContain('--aspect-ratio: 16/9');
		});

		test('scaleType=originalの場合のstyle生成', async () => {
			const data = {
				path: ['/path/to/image.jpg'],
				alt: ['alt1'],
				width: [100],
				height: [50],
				media: [''],
				fileSize: '100KB',
				mediaInput: '',
				style: '',
				cssWidth: '200px',
				scaleType: 'original',
				scale: 100,
				aspectRatio: 'unset',
				cssWidthNumber: 200,
				cssWidthUnit: 'px',
				lazy: false,
				loading: ['eager'],
				caption: '',
				altEditable: '',
				node: 'div',
				href: '',
				popup: false,
				target: null,
				targetBlank: false,
				command: null,
			} as const satisfies Readonly<ImageItemData>;

			const result = await imageItem.editorOptions?.beforeChange?.(data, editor);

			expect(result?.style).toBe('--css-width: 200px');
			expect(result?.style).not.toContain('--object-fit');
			expect(result?.style).not.toContain('--aspect-ratio');
		});
	});
});
