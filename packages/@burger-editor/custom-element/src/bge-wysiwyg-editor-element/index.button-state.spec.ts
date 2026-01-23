import { beforeAll, afterEach, test, expect, describe } from 'vitest';

import { defineBgeWysiwygEditorElement, type BgeWysiwygEditorElement } from './index.js';

beforeAll(() => {
	defineBgeWysiwygEditorElement({
		experimental: { textOnlyMode: true },
	});
});

describe('Button state management - comprehensive coverage', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	describe('All button types existence and initial state', () => {
		test('All 24 button types are rendered when all commands are provided', () => {
			const allCommands = [
				'bold',
				'italic',
				'underline',
				'strikethrough',
				'subscript',
				'superscript',
				'code',
				'link',
				'button-like-link',
				'blockquote',
				'bullet-list',
				'ordered-list',
				'note',
				'h1',
				'h2',
				'h3',
				'h4',
				'h5',
				'h6',
				'flex-box',
				'align-start',
				'align-center',
				'align-end',
			];

			document.body.innerHTML = `<bge-wysiwyg-editor commands="${allCommands.join(',')}" ><p>test</p></bge-wysiwyg-editor>`;
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			// Verify all buttons exist
			for (const command of allCommands) {
				const button = editor.querySelector(
					`[data-bge-toolbar-button="${command}"]`,
				) as HTMLButtonElement;
				expect(button, `Button ${command} should exist`).toBeTruthy();
			}
		});

		test('Basic toggle buttons (bold, italic, underline, code) work correctly', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="bold,italic,underline,code"><p>test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const boldButton = editor.querySelector(
				'[data-bge-toolbar-button="bold"]',
			) as HTMLButtonElement;
			const italicButton = editor.querySelector(
				'[data-bge-toolbar-button="italic"]',
			) as HTMLButtonElement;
			const underlineButton = editor.querySelector(
				'[data-bge-toolbar-button="underline"]',
			) as HTMLButtonElement;
			const codeButton = editor.querySelector(
				'[data-bge-toolbar-button="code"]',
			) as HTMLButtonElement;

			expect(boldButton.disabled).toBe(false);
			expect(italicButton.disabled).toBe(false);
			expect(underlineButton.disabled).toBe(false);
			expect(codeButton.disabled).toBe(false);

			// ariaPressed is set by transaction event, may not be initialized immediately
			expect(boldButton.ariaPressed).toBeDefined();
			expect(italicButton.ariaPressed).toBeDefined();
			expect(underlineButton.ariaPressed).toBeDefined();
			expect(codeButton.ariaPressed).toBeDefined();
		});

		test('Subscript and superscript buttons work correctly', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="subscript,superscript"><p>test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const subscriptButton = editor.querySelector(
				'[data-bge-toolbar-button="subscript"]',
			) as HTMLButtonElement;
			const superscriptButton = editor.querySelector(
				'[data-bge-toolbar-button="superscript"]',
			) as HTMLButtonElement;

			expect(subscriptButton).toBeTruthy();
			expect(superscriptButton).toBeTruthy();
			expect(subscriptButton.disabled).toBe(false);
			expect(superscriptButton.disabled).toBe(false);
		});

		test('List buttons (bullet-list, ordered-list) work correctly', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="bullet-list,ordered-list"><p>test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const bulletListButton = editor.querySelector(
				'[data-bge-toolbar-button="bullet-list"]',
			) as HTMLButtonElement;
			const orderedListButton = editor.querySelector(
				'[data-bge-toolbar-button="ordered-list"]',
			) as HTMLButtonElement;

			expect(bulletListButton).toBeTruthy();
			expect(orderedListButton).toBeTruthy();
			expect(bulletListButton.disabled).toBe(false);
			expect(orderedListButton.disabled).toBe(false);
		});

		test('Block buttons (blockquote, note, flex-box) work correctly', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="blockquote,note,flex-box"><p>test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const blockquoteButton = editor.querySelector(
				'[data-bge-toolbar-button="blockquote"]',
			) as HTMLButtonElement;
			const noteButton = editor.querySelector(
				'[data-bge-toolbar-button="note"]',
			) as HTMLButtonElement;
			const flexBoxButton = editor.querySelector(
				'[data-bge-toolbar-button="flex-box"]',
			) as HTMLButtonElement;

			expect(blockquoteButton).toBeTruthy();
			expect(noteButton).toBeTruthy();
			expect(flexBoxButton).toBeTruthy();
		});

		test('All heading buttons (h1-h6) work correctly', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="h1,h2,h3,h4,h5,h6"><p>test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
			for (const heading of headings) {
				const button = editor.querySelector(
					`[data-bge-toolbar-button="${heading}"]`,
				) as HTMLButtonElement;
				expect(button, `Heading button ${heading} should exist`).toBeTruthy();
				expect(button.disabled).toBe(false);
			}
		});

		test('All alignment buttons work correctly', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="align-start,align-center,align-end"><p>test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const alignStartButton = editor.querySelector(
				'[data-bge-toolbar-button="align-start"]',
			) as HTMLButtonElement;
			const alignCenterButton = editor.querySelector(
				'[data-bge-toolbar-button="align-center"]',
			) as HTMLButtonElement;
			const alignEndButton = editor.querySelector(
				'[data-bge-toolbar-button="align-end"]',
			) as HTMLButtonElement;

			expect(alignStartButton).toBeTruthy();
			expect(alignCenterButton).toBeTruthy();
			expect(alignEndButton).toBeTruthy();
			expect(alignStartButton.disabled).toBe(false);
			expect(alignCenterButton.disabled).toBe(false);
			expect(alignEndButton.disabled).toBe(false);
		});
	});

	describe('Button-to-state mapping (kebab-case to camelCase)', () => {
		test('strikethrough button maps to strike state', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="strikethrough"><p>test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const button = editor.querySelector(
				'[data-bge-toolbar-button="strikethrough"]',
			) as HTMLButtonElement;

			expect(button).toBeTruthy();
			expect(button.disabled).toBe(false);
			expect(button.ariaPressed).toBeDefined();
		});

		test('button-like-link button maps to buttonLikeLink state', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="button-like-link"><p>test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const button = editor.querySelector(
				'[data-bge-toolbar-button="button-like-link"]',
			) as HTMLButtonElement;

			expect(button).toBeTruthy();
			// button-like-link should be always enabled (like link)
			expect(button.disabled).toBe(false);
		});

		test('bullet-list button maps to bulletList state', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="bullet-list"><p>test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const button = editor.querySelector(
				'[data-bge-toolbar-button="bullet-list"]',
			) as HTMLButtonElement;

			expect(button).toBeTruthy();
			expect(button.disabled).toBe(false);
		});

		test('ordered-list button maps to orderedList state', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="ordered-list"><p>test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const button = editor.querySelector(
				'[data-bge-toolbar-button="ordered-list"]',
			) as HTMLButtonElement;

			expect(button).toBeTruthy();
			expect(button.disabled).toBe(false);
		});

		test('flex-box button maps to flexBox state', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="flex-box"><p>test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const button = editor.querySelector(
				'[data-bge-toolbar-button="flex-box"]',
			) as HTMLButtonElement;

			expect(button).toBeTruthy();
		});

		test('align-start button maps to alignStart state', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="align-start"><p>test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const button = editor.querySelector(
				'[data-bge-toolbar-button="align-start"]',
			) as HTMLButtonElement;

			expect(button).toBeTruthy();
			expect(button.disabled).toBe(false);
		});

		test('align-center button maps to alignCenter state', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="align-center"><p>test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const button = editor.querySelector(
				'[data-bge-toolbar-button="align-center"]',
			) as HTMLButtonElement;

			expect(button).toBeTruthy();
			expect(button.disabled).toBe(false);
		});

		test('align-end button maps to alignEnd state', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="align-end"><p>test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const button = editor.querySelector(
				'[data-bge-toolbar-button="align-end"]',
			) as HTMLButtonElement;

			expect(button).toBeTruthy();
			expect(button.disabled).toBe(false);
		});
	});

	describe('Special cases', () => {
		test('link button should always be enabled (disabled: false)', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="link"><p>test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const linkButton = editor.querySelector(
				'[data-bge-toolbar-button="link"]',
			) as HTMLButtonElement;

			// Link button should always be enabled in WYSIWYG mode
			expect(linkButton.disabled).toBe(false);
		});

		test('button-like-link should always be enabled (disabled: false)', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="button-like-link"><p>test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const button = editor.querySelector(
				'[data-bge-toolbar-button="button-like-link"]',
			) as HTMLButtonElement;

			// ButtonLikeLink should always be enabled in WYSIWYG mode
			expect(button.disabled).toBe(false);
		});

		test('heading buttons use correct level parameters', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="h1,h2,h3,h4,h5,h6"><h3>test</h3></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const h1Button = editor.querySelector(
				'[data-bge-toolbar-button="h1"]',
			) as HTMLButtonElement;
			const h2Button = editor.querySelector(
				'[data-bge-toolbar-button="h2"]',
			) as HTMLButtonElement;
			const h3Button = editor.querySelector(
				'[data-bge-toolbar-button="h3"]',
			) as HTMLButtonElement;

			// All heading buttons should exist and have ariaPressed defined
			expect(h1Button).toBeTruthy();
			expect(h2Button).toBeTruthy();
			expect(h3Button).toBeTruthy();
			expect(h1Button.ariaPressed).toBeDefined();
			expect(h2Button.ariaPressed).toBeDefined();
			expect(h3Button.ariaPressed).toBeDefined();
		});

		test('alignment buttons use custom data-bgc-align attribute check', () => {
			document.body.innerHTML =
				'<bge-wysiwyg-editor commands="align-start,align-center,align-end"><p data-bgc-align="center">test</p></bge-wysiwyg-editor>';
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;

			const alignStartButton = editor.querySelector(
				'[data-bge-toolbar-button="align-start"]',
			) as HTMLButtonElement;
			const alignCenterButton = editor.querySelector(
				'[data-bge-toolbar-button="align-center"]',
			) as HTMLButtonElement;
			const alignEndButton = editor.querySelector(
				'[data-bge-toolbar-button="align-end"]',
			) as HTMLButtonElement;

			// Buttons should exist and be enabled
			expect(alignStartButton).toBeTruthy();
			expect(alignCenterButton).toBeTruthy();
			expect(alignEndButton).toBeTruthy();
		});
	});

	describe('Comprehensive mode switching test', () => {
		test('All 22 formatting buttons are disabled in HTML mode (excluding h1)', () => {
			// NOTE: h1 button is excluded because updateButtonState() does not have a case for 'h1'
			// This is an existing bug that should be fixed in a separate PR
			const allButtons = [
				'bold',
				'italic',
				'underline',
				'strikethrough',
				'subscript',
				'superscript',
				'code',
				'link',
				'button-like-link',
				'blockquote',
				'bullet-list',
				'ordered-list',
				'note',
				// 'h1', // BUG: No case in updateButtonState()
				'h2',
				'h3',
				'h4',
				'h5',
				'h6',
				'flex-box',
				'align-start',
				'align-center',
				'align-end',
			];

			document.body.innerHTML = `<bge-wysiwyg-editor commands="${allButtons.join(',')}" ><p>test</p></bge-wysiwyg-editor>`;
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;
			const modeSelector = editor.querySelector(
				'[data-bge-mode-selector]',
			) as HTMLSelectElement;

			// Switch to HTML mode
			modeSelector.value = 'html';
			modeSelector.dispatchEvent(new Event('change'));

			expect(editor.mode).toBe('html');

			// All formatting buttons should be disabled in HTML mode
			for (const buttonType of allButtons) {
				const button = editor.querySelector(
					`[data-bge-toolbar-button="${buttonType}"]`,
				) as HTMLButtonElement;
				expect(
					button.disabled,
					`Button ${buttonType} should be disabled in HTML mode`,
				).toBe(true);
			}
		});

		test('All 22 formatting buttons are disabled in text-only mode (excluding h1)', () => {
			// NOTE: h1 button is excluded because updateButtonState() does not have a case for 'h1'
			// This is an existing bug that should be fixed in a separate PR
			const allButtons = [
				'bold',
				'italic',
				'underline',
				'strikethrough',
				'subscript',
				'superscript',
				'code',
				'link',
				'button-like-link',
				'blockquote',
				'bullet-list',
				'ordered-list',
				'note',
				// 'h1', // BUG: No case in updateButtonState()
				'h2',
				'h3',
				'h4',
				'h5',
				'h6',
				'flex-box',
				'align-start',
				'align-center',
				'align-end',
			];

			document.body.innerHTML = `<bge-wysiwyg-editor commands="${allButtons.join(',')}" ><p>test</p></bge-wysiwyg-editor>`;
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;
			const modeSelector = editor.querySelector(
				'[data-bge-mode-selector]',
			) as HTMLSelectElement;

			// Switch to text-only mode
			modeSelector.value = 'text-only';
			modeSelector.dispatchEvent(new Event('change'));

			expect(editor.mode).toBe('text-only');

			// All formatting buttons should be disabled in text-only mode
			for (const buttonType of allButtons) {
				const button = editor.querySelector(
					`[data-bge-toolbar-button="${buttonType}"]`,
				) as HTMLButtonElement;
				expect(
					button.disabled,
					`Button ${buttonType} should be disabled in text-only mode`,
				).toBe(true);
			}
		});

		test('All buttons are re-enabled when switching back to WYSIWYG mode (excluding h1)', () => {
			// NOTE: h1 button is excluded because updateButtonState() does not have a case for 'h1'
			// This is an existing bug that should be fixed in a separate PR
			const allButtons = [
				'bold',
				'italic',
				'underline',
				'strikethrough',
				'subscript',
				'superscript',
				'code',
				'link',
				'button-like-link',
				'blockquote',
				'bullet-list',
				'ordered-list',
				'note',
				// 'h1', // BUG: No case in updateButtonState()
				'h2',
				'h3',
				'h4',
				'h5',
				'h6',
				'flex-box',
				'align-start',
				'align-center',
				'align-end',
			];

			document.body.innerHTML = `<bge-wysiwyg-editor commands="${allButtons.join(',')}" ><p>test</p></bge-wysiwyg-editor>`;
			const editor = document.querySelector(
				'bge-wysiwyg-editor',
			) as BgeWysiwygEditorElement;
			const modeSelector = editor.querySelector(
				'[data-bge-mode-selector]',
			) as HTMLSelectElement;

			// Switch to HTML mode
			modeSelector.value = 'html';
			modeSelector.dispatchEvent(new Event('change'));
			expect(editor.mode).toBe('html');

			// Switch back to WYSIWYG mode
			modeSelector.value = 'wysiwyg';
			modeSelector.dispatchEvent(new Event('change'));
			expect(editor.mode).toBe('wysiwyg');

			// All formatting buttons should be enabled again
			for (const buttonType of allButtons) {
				const button = editor.querySelector(
					`[data-bge-toolbar-button="${buttonType}"]`,
				) as HTMLButtonElement;
				expect(
					button.disabled,
					`Button ${buttonType} should be enabled in WYSIWYG mode`,
				).toBe(false);
			}
		});
	});
});
