import type { BgeWysiwygElement } from '../bge-wysiwyg-element/index.js';
import type { EditorState } from '../bge-wysiwyg-element/types.js';

/**
 * TipTapエディタの状態に基づいて全ツールバーボタンの現在状態を生成
 * @param wysiwygElement - TipTapエディタを含むwysiwyg要素
 * @returns 全23ボタン(24state keys)のdisabled/active状態を含むEditorStateオブジェクト
 * @throws {ReferenceError} TipTapエディタが初期化されていない場合
 */
export function getCurrentEditorState(wysiwygElement: BgeWysiwygElement): EditorState {
	const editor = wysiwygElement.editor;
	if (!editor) {
		throw new ReferenceError('TipTap editor is not initialized');
	}

	return {
		bold: {
			disabled: !editor.can().chain().focus().toggleBold().run(),
			active: editor.isActive('bold'),
		},
		italic: {
			disabled: !editor.can().chain().focus().toggleItalic().run(),
			active: editor.isActive('italic'),
		},
		underline: {
			disabled: !editor.can().chain().focus().toggleUnderline().run(),
			active: editor.isActive('underline'),
		},
		strike: {
			disabled: !editor.can().chain().focus().toggleStrike().run(),
			active: editor.isActive('strike'),
		},
		subscript: {
			disabled: !editor.can().chain().focus().toggleSubscript().run(),
			active: editor.isActive('subscript'),
		},
		superscript: {
			disabled: !editor.can().chain().focus().toggleSuperscript().run(),
			active: editor.isActive('superscript'),
		},
		code: {
			disabled: !editor.can().chain().focus().toggleCode().run(),
			active: editor.isActive('code'),
		},
		link: {
			disabled: false, // linkは常に有効
			active: editor.isActive('link'),
		},
		buttonLikeLink: {
			disabled: false,
			active: editor.isActive('buttonLikeLink'),
		},
		bulletList: {
			disabled: !editor.can().chain().focus().toggleBulletList().run(),
			active: editor.isActive('bulletList'),
		},
		orderedList: {
			disabled: !editor.can().chain().focus().toggleOrderedList().run(),
			active: editor.isActive('orderedList'),
		},
		blockquote: {
			disabled: !editor.can().chain().focus().toggleBlockquote().run(),
			active: editor.isActive('blockquote'),
		},
		note: {
			disabled: !editor.can().chain().focus().toggleNote().run(),
			active: editor.isActive('note'),
		},
		flexBox: {
			disabled: !editor.can().chain().focus().toggleFlexBox().run(),
			active: editor.isActive('flexBox'),
		},
		h1: {
			disabled: !editor.can().chain().focus().toggleHeading({ level: 1 }).run(),
			active: editor.isActive('heading', { level: 1 }),
		},
		h2: {
			disabled: !editor.can().chain().focus().toggleHeading({ level: 2 }).run(),
			active: editor.isActive('heading', { level: 2 }),
		},
		h3: {
			disabled: !editor.can().chain().focus().toggleHeading({ level: 3 }).run(),
			active: editor.isActive('heading', { level: 3 }),
		},
		h4: {
			disabled: !editor.can().chain().focus().toggleHeading({ level: 4 }).run(),
			active: editor.isActive('heading', { level: 4 }),
		},
		h5: {
			disabled: !editor.can().chain().focus().toggleHeading({ level: 5 }).run(),
			active: editor.isActive('heading', { level: 5 }),
		},
		h6: {
			disabled: !editor.can().chain().focus().toggleHeading({ level: 6 }).run(),
			active: editor.isActive('heading', { level: 6 }),
		},
		image: {
			disabled: !editor.can().chain().focus().setImage({ src: '' }).run(),
			active: editor.isActive('image'),
		},
		alignStart: {
			disabled: !editor.can().chain().focus().toggleAlign('start').run(),
			active: editor.isActive('paragraph', { 'data-bgc-align': 'start' }),
		},
		alignCenter: {
			disabled: !editor.can().chain().focus().toggleAlign('center').run(),
			active: editor.isActive('paragraph', { 'data-bgc-align': 'center' }),
		},
		alignEnd: {
			disabled: !editor.can().chain().focus().toggleAlign('end').run(),
			active: editor.isActive('paragraph', { 'data-bgc-align': 'end' }),
		},
	};
}
