import { ComponentObserver, ItemEditorDialog, Item } from '@burger-editor/core';
import { test, expect, describe, beforeEach } from 'vitest';
import { page } from 'vitest/browser';

import imageItemSeed from './index.js';

type ImageItemData = typeof imageItemSeed._;

/**
 *
 * @param template
 */
function createEditor(template?: string) {
	const componentObserver = new ComponentObserver();
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
		getComponentObserver: () => componentObserver,
		getTemplate: () =>
			document.createRange().createContextualFragment(template ?? '').children,
		getContentStylesheet: () => Promise.resolve(''),
	});

	return editor;
}

/**
 *
 * @param html
 */
function createItemElement(html?: string) {
	const el = document.createElement('div');
	el.dataset.bgi = imageItemSeed.name;
	el.innerHTML = html ?? imageItemSeed.template;

	const seeds = new Map<string, typeof imageItemSeed>([
		[imageItemSeed.name, imageItemSeed],
	]);

	const editor = createEditor(imageItemSeed.editor);

	const item = Item.rebind(el, seeds, editor);

	document.body.append(item.el);

	return item;
}

describe('imageItemSeed', () => {
	beforeEach(() => {
		// Clean up the document body
		document.body.innerHTML = '';
	});

	describe('beforeOpen関数', () => {
		test('pathの__org置換', () => {
			const editor = createEditor();

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

			const result = imageItemSeed.editorOptions?.beforeOpen?.(data, editor);

			expect(result?.path).toEqual(['/path/to/image.jpg', '/path/to/image2.png']);
		});

		test('loadingからlazyへの変換', () => {
			const editor = createEditor();

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

			const result = imageItemSeed.editorOptions?.beforeOpen?.(data, editor);

			expect(result?.lazy).toBe(true);
		});

		test('nodeとcommandからpopupへの変換', () => {
			const editor = createEditor();

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

			const result = imageItemSeed.editorOptions?.beforeOpen?.(data, editor);

			expect(result?.popup).toBe(true);
		});

		test('nodeとtargetからtargetBlankへの変換', () => {
			const editor = createEditor();

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

			const result = imageItemSeed.editorOptions?.beforeOpen?.(data, editor);

			expect(result?.targetBlank).toBe(true);
		});

		test('altからaltEditableへの変換', () => {
			const editor = createEditor();

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

			const result = imageItemSeed.editorOptions?.beforeOpen?.(data, editor);

			expect(result?.altEditable).toBe('test alt text');
		});

		test('altが空の場合、altEditableは空文字', () => {
			const editor = createEditor();

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

			const result = imageItemSeed.editorOptions?.beforeOpen?.(data, editor);

			expect(result?.altEditable).toBe('');
		});
	});

	describe('beforeChange関数', () => {
		test('lazyからloadingへの変換', async () => {
			const editor = createEditor();

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

			const result = await imageItemSeed.editorOptions?.beforeChange?.(data, editor);

			expect(result?.loading).toStrictEqual(['lazy']);
		});

		test('popupからnodeとcommandへの変換', async () => {
			const editor = createEditor();

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

			const result = await imageItemSeed.editorOptions?.beforeChange?.(data, editor);

			expect(result?.node).toBe('button');
			expect(result?.command).toBe('show-modal');
		});

		test('hrefとtargetBlankからnodeとtargetへの変換', async () => {
			const editor = createEditor();

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

			const result = await imageItemSeed.editorOptions?.beforeChange?.(data, editor);

			expect(result?.node).toBe('a');
			expect(result?.target).toBe('_blank');
		});

		test('scaleType=containerの場合のstyle生成', async () => {
			const editor = createEditor();

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

			const result = await imageItemSeed.editorOptions?.beforeChange?.(data, editor);

			expect(result?.style).toContain('--css-width: 80cqi');
			expect(result?.style).toContain('--object-fit: cover');
			expect(result?.style).toContain('--aspect-ratio: 16/9');
		});

		test('scaleType=originalの場合のstyle生成', async () => {
			const editor = createEditor();

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

			const result = await imageItemSeed.editorOptions?.beforeChange?.(data, editor);

			expect(result?.style).toBe('--css-width: 200px');
			expect(result?.style).not.toContain('--object-fit');
			expect(result?.style).not.toContain('--aspect-ratio');
		});
	});
});

describe('Playwrightテスト', () => {
	beforeEach(() => {
		// Clean up the document body
		document.body.innerHTML = '';
	});

	test('altEditableを変更した際にaltが即座に更新されること', async () => {
		const item = createItemElement(imageItemSeed.template);
		const trigger = page.getByAltText('サンプル画像');
		await trigger.click();

		const editor = item.editor;

		const initialAlt = editor.get('$alt');
		expect(initialAlt).toStrictEqual(['サンプル画像']);

		const altEditableElement = editor.find('[name="bge-alt-editable"]');
		expect(altEditableElement).toBeTruthy();
		const altEditableLocator = page.elementLocator(altEditableElement!);
		await altEditableLocator.fill('新しいaltテキスト');
		altEditableLocator.element().blur();

		const updatedAlt = editor.get('$alt');
		expect(updatedAlt[0]).toBe('新しいaltテキスト');
	});

	test('scaleTypeを変更した際にcssWidthUnitが即座に更新されること', async () => {
		const item = createItemElement(imageItemSeed.template);
		const trigger = page.getByAltText('サンプル画像');
		await trigger.click();

		const editor = item.editor;

		// Check the "container" radio button
		const containerRadioElement = editor.find(
			'[name="bge-scale-type"][value="container"]',
		);
		expect(containerRadioElement).toBeTruthy();
		const containerRadioLocator = page.elementLocator(containerRadioElement!);
		await containerRadioLocator.click();
		const cssWidthUnit = editor.get('$cssWidthUnit');
		expect(cssWidthUnit).toBe('cqi');

		// Check the "original" radio button
		const originalRadioElement = editor.find('[name="bge-scale-type"][value="original"]');
		expect(originalRadioElement).toBeTruthy();
		const originalRadioLocator = page.elementLocator(originalRadioElement!);
		await originalRadioLocator.click();
		const cssWidthUnit2 = editor.get('$cssWidthUnit');
		expect(cssWidthUnit2).toBe('px');
	});

	test('cssWidthNumberを変更した際にcssWidthが即座に更新されること', async () => {
		const item = createItemElement(imageItemSeed.template);
		const trigger = page.getByAltText('サンプル画像');
		await trigger.click();

		const editor = item.editor;

		// Check the "original" radio button
		const originalRadioElement = editor.find('[name="bge-scale-type"][value="original"]');
		expect(originalRadioElement).toBeTruthy();
		const originalRadioLocator = page.elementLocator(originalRadioElement!);
		await originalRadioLocator.click();

		// Change the "cssWidthNumber" input field
		const cssWidthNumberElement = editor.find('[name="bge-css-width-number"]');
		expect(cssWidthNumberElement).toBeTruthy();
		const cssWidthNumberLocator = page.elementLocator(cssWidthNumberElement!);
		await cssWidthNumberLocator.fill('250');
		cssWidthNumberLocator.element().blur();

		const cssWidth = editor.get('$cssWidth');
		expect(cssWidth).toBe('250px');
	});

	test('scaleを変更した際にcssWidthが即座に更新されること', async () => {
		const item = createItemElement(imageItemSeed.template);
		const trigger = page.getByAltText('サンプル画像');
		await trigger.click();

		const editor = item.editor;

		// Check the "container" radio button
		const containerRadioElement = editor.find<HTMLInputElement>(
			'[name="bge-scale-type"][value="container"]',
		);
		expect(containerRadioElement).toBeTruthy();
		const containerRadioLocator = page.elementLocator(containerRadioElement!);
		await containerRadioLocator.click();

		// Change the "scale" input field
		const scaleElement = editor.find<HTMLInputElement>('[name="bge-scale"]');
		expect(scaleElement).toBeTruthy();
		const scaleLocator = page.elementLocator(scaleElement!);
		await scaleLocator.fill('75');
		scaleLocator.element().blur();

		const cssWidth = editor.get('$cssWidth');
		expect(cssWidth).toBe('75cqi');
	});

	test('popupチェックボックスを変更した際にhrefとtargetBlankが無効化/有効化されること', async () => {
		const item = createItemElement(imageItemSeed.template);
		const trigger = page.getByAltText('サンプル画像');
		await trigger.click();

		const editor = item.editor;

		// Check the "popup" checkbox
		const popupCheckboxElement = editor.find<HTMLInputElement>('[name="bge-popup"]');
		expect(popupCheckboxElement).toBeTruthy();
		const popupCheckboxLocator = page.elementLocator(popupCheckboxElement!);
		await popupCheckboxLocator.click();

		// Check if href and targetBlank are disabled
		const hrefInput = editor.find<HTMLInputElement>('[name="bge-href"]');
		const targetBlankCheckbox = editor.find<HTMLInputElement>(
			'[name="bge-target-blank"]',
		);
		expect(hrefInput?.disabled).toBe(true);
		expect(targetBlankCheckbox?.disabled).toBe(true);

		// Disable the "popup" checkbox
		await popupCheckboxLocator.click();

		// Check if href and targetBlank are enabled
		expect(hrefInput?.disabled).toBe(false);
		expect(targetBlankCheckbox?.disabled).toBe(false);
	});

	// TODO: タブ切り替えの安定実装を待つ
	test.skip('mediaInputを変更した際にmediaが即座に更新されること', async () => {
		const item = createItemElement(imageItemSeed.template);
		const trigger = page.getByAltText('サンプル画像');
		await trigger.click();

		const editor = item.editor;

		// Change the "mediaInput" input field
		const mediaInputElement = editor.find<HTMLInputElement>('[name="bge-media-input"]');
		expect(mediaInputElement).toBeTruthy();
		const mediaInputLocator = page.elementLocator(mediaInputElement!);
		await mediaInputLocator.fill('(min-width: 768px)');
		mediaInputLocator.element().blur();

		// Check if media is updated
		const media = editor.get('$media');
		expect(media[0]).toBe('(min-width: 768px)');
	});

	test('最終的なitemDataの変化', async () => {
		const item = createItemElement(imageItemSeed.template);
		const trigger = page.getByAltText('サンプル画像');
		await trigger.click();

		const editor = item.editor;

		const altEditableElement = editor.find('[name="bge-alt-editable"]');
		expect(altEditableElement).toBeTruthy();
		const altEditableLocator = page.elementLocator(altEditableElement!);
		await altEditableLocator.fill('テストalt');

		const captionElement = editor.find('[name="bge-caption"]');
		expect(captionElement).toBeTruthy();
		const captionLocator = page.elementLocator(captionElement!);
		await captionLocator.fill('テストキャプション');

		const containerRadioElement = editor.find(
			'[name="bge-scale-type"][value="container"]',
		);
		expect(containerRadioElement).toBeTruthy();
		const containerRadioLocator = page.elementLocator(containerRadioElement!);
		await containerRadioLocator.click();

		const lazyCheckboxElement = editor.find('[name="bge-lazy"]');
		expect(lazyCheckboxElement).toBeTruthy();
		const lazyCheckboxLocator = page.elementLocator(lazyCheckboxElement!);
		await lazyCheckboxLocator.click();

		// Click the complete button
		const completeButtonElement = document.querySelector(
			'dialog[open] footer button[type="submit"][form]',
		);
		expect(completeButtonElement).toBeTruthy();
		const completeButtonLocator = page.elementLocator(completeButtonElement!);
		await completeButtonLocator.click();

		// Check if the dialog is closed
		const closedDialogElement = document.querySelector('dialog[open]');
		expect(closedDialogElement).toBeNull();

		// Get the final itemData
		const finalData = item.export();

		const loading = finalData.loading;
		expect(loading).toStrictEqual(['eager']);
		const nodeElement = item.el.querySelector('[data-bge*=":node"]');
		expect(nodeElement).toBeTruthy();
		expect(nodeElement!.tagName.toLowerCase()).toBe('div');

		expect(finalData.style).toContain('--css-width');
	});

	test('loadImage関数の正常な画像読み込み', async () => {
		const item = createItemElement(imageItemSeed.template);
		const trigger = page.getByAltText('サンプル画像');
		await trigger.click();

		const editor = item.editor;

		// Create a 1x1 transparent PNG image (data URL)
		const dataURL =
			'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

		const { promise, resolve } = Promise.withResolvers<void>();
		editor.componentObserver.on('update-css-width', () => {
			resolve();
		});

		editor.componentObserver.notify('file-select', {
			path: dataURL,
			fileSize: 100,
			isEmpty: false,
			isMounted: false,
		});

		await promise;

		const path = editor.get('$path');
		expect(Array.isArray(path)).toBe(true);
		expect(path[0]).toBe(dataURL);
	});

	test('ダイアログを閉じた際にitemDataが正しく更新されること', async () => {
		const item = createItemElement(`
<div data-bge=":style, :scale, :scale-type, :aspect-ratio" data-bge-scale="25" data-bge-scale-type="original" data-bge-aspect-ratio="unset" style="--css-width: 100px; --object-fit: cover; --aspect-ratio: unset">
	<figure>
		<div data-bge=":node, :href, :target, :command">
			<picture data-bge-list>
				<img src="%sampleImagePath%" alt="サンプル画像" data-bge="path:src, :alt, :width, :height, :loading, :media" width="400" height="300" loading="lazy" />
			</picture>
		</div>
		<figcaption data-bge="caption"></figcaption>
	</figure>
</div>
`);
		const editor = item.editor;

		const trigger = page.getByAltText('サンプル画像');
		await trigger.click();

		expect(editor.get('$cssWidthNumber')).toBe(100);
		expect(editor.get('$cssWidthUnit')).toBe('px');
		expect(editor.get('$scale')).toBe(25);
		expect(editor.get('$scaleType')).toBe('original');

		const containerRadioElement = editor.find(
			'[name="bge-scale-type"][value="container"]',
		);
		expect(containerRadioElement).toBeTruthy();
		const containerRadioLocator = page.elementLocator(containerRadioElement!);
		await containerRadioLocator.click();

		expect(editor.get('$cssWidthNumber')).toBe(25);
		expect(editor.get('$cssWidthUnit')).toBe('cqi');
		expect(editor.get('$scale')).toBe(25);
		expect(editor.get('$scaleType')).toBe('container');

		// Click the complete button
		const completeButtonElement = document.querySelector(
			'dialog[open] footer button[type="submit"][form]',
		);
		expect(completeButtonElement).toBeTruthy();
		const completeButtonLocator = page.elementLocator(completeButtonElement!);
		await completeButtonLocator.click();

		const finalData = item.export();
		expect(finalData).toStrictEqual({
			path: ['%sampleImagePath%'],
			alt: ['サンプル画像'],
			width: [400],
			height: [300],
			media: [null],
			loading: ['lazy'],
			aspectRatio: 'unset',
			caption: '',
			command: null,
			href: '',
			node: 'div',
			scale: 25,
			scaleType: 'container',
			style: '--css-width: 25cqi; --object-fit: cover; --aspect-ratio: unset;',
			target: null,
		});
	});
});
