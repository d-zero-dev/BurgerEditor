import type {
	BurgerEditorEngine,
	EditableAreaHost,
	EditableAreaType,
} from '@burger-editor/core';

import { CSS_LAYER } from '@burger-editor/core';
import { appendStylesheetTo } from '@burger-editor/utils';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { animateInsertion } from '../animate-insertion.js';
import { useUIState } from '../use-engine.js';

import { BlockMenu } from './block-menu.js';
import { InitialInsertionButton } from './initial-insertion-button.js';

const CONTAINER_PADDING = 10;
const CONTENT_ID = 'bge-editable-area';

/**
 *
 * @param engine
 * @param type
 * @param value
 * @param syncFromContent
 */
function commitEditableAreaSource(
	engine: BurgerEditorEngine,
	type: EditableAreaType,
	value: string,
	syncFromContent: (
		content: NonNullable<ReturnType<typeof engine.getEditableContent>>,
	) => void,
) {
	const content = engine.getEditableContent(type);
	if (!content) {
		return;
	}
	void content.replaceContents(value).then(() => {
		engine.save();
		syncFromContent(content);
	});
}

/**
 * The React shell of one editable area: the iframe hosting the edited
 * content, the HTML source textarea, and the in-frame UI islands
 * (block menu, initial insertion button) rendered through a portal.
 *
 * All presentation state is React state derived from `engine.uiState`
 * and engine events — the engine never touches this component's DOM.
 * The iframe is rendered unconditionally at a fixed position in the
 * tree (visibility is `hidden` only) because unmounting an iframe
 * destroys its document, and the engine owns the content inside it.
 * @param root0
 * @param root0.engine
 * @param root0.type
 * @param root0.initialContent
 * @param root0.stylesheets
 * @param root0.classList
 * @param root0.onReady
 * @example
 * ```tsx
 * root.render(
 * 	<EditableAreaView
 * 		engine={engine}
 * 		type="main"
 * 		initialContent={html}
 * 		stylesheets={stylesheets}
 * 		classList={classList}
 * 		onReady={(host) => resolve(host)}
 * 	/>,
 * );
 * ```
 */
export function EditableAreaView({
	engine,
	type,
	initialContent,
	stylesheets,
	classList,
	onReady,
}: {
	readonly engine: BurgerEditorEngine;
	readonly type: EditableAreaType;
	readonly initialContent: string;
	readonly stylesheets: readonly { readonly path: string; readonly id: string }[];
	readonly classList: readonly string[];
	readonly onReady: (host: EditableAreaHost) => void;
}) {
	const sourceMode = useUIState(engine, (s) => s.sourceMode[type]);
	const processing = useUIState(engine, (s) => s.processing);
	const dialogOpen = useUIState(engine, (s) => s.openDialog !== null);

	const [active, setActive] = useState(type === 'main');
	const [sourceText, setSourceText] = useState(initialContent);
	const [isEmpty, setIsEmpty] = useState(initialContent.trim() === '');
	const [height, setHeight] = useState(0);
	const [frameBody, setFrameBody] = useState<HTMLElement | null>(null);

	const initializedRef = useRef(false);
	const resizeObserverRef = useRef<ResizeObserver | null>(null);

	// iframe文書はここで一度だけ組み立てる。再レンダリングでiframeが
	// unmountされると文書ごと消えるため、初期化はrefコールバック +
	// 一度きりガードで行い、以後iframeはツリーの固定位置に置き続ける
	const initFrame = (iframe: HTMLIFrameElement | null) => {
		if (!iframe || initializedRef.current) {
			return;
		}
		initializedRef.current = true;

		const frameWindow = iframe.contentWindow;
		if (!frameWindow) {
			throw new Error('Impossible error: The contentWindow of created iframe is null.');
		}
		const frameDoc = frameWindow.document;
		frameDoc.open();
		// ブラウザはopen/closeだけでhtml/head/bodyの骨組みを自動生成するが、
		// jsdomは生成しないため明示的に書き込む（実ブラウザでは等価）
		frameDoc.write('<!doctype html><html><head></head><body></body></html>');
		frameDoc.close();

		for (const { path, id } of stylesheets) {
			appendStylesheetTo(frameDoc, path, id);
		}

		// ポータルで差し込むブロックメニュー層の位置決め。client本体の
		// CSSはiframe文書に読み込まれないため、ここで直接注入する
		const blockMenuStyle = frameDoc.createElement('style');
		blockMenuStyle.textContent = `@layer ${CSS_LAYER.ui} {
			[data-bge-component='block-menu'] {
				position: absolute;
				z-index: 2147483647;
				pointer-events: none;
			}
		}`;
		frameDoc.head.append(blockMenuStyle);

		frameDoc.body.setAttribute('style', 'margin: 0; border: 0;');

		// このiframe文書内のボタンが commandfor で参照するバス受信要素
		engine.commandBus.createReceiver(frameDoc.body);

		const containerElement = frameDoc.createElement('div');
		containerElement.id = CONTENT_ID;
		containerElement.style.setProperty('padding', `${CONTAINER_PADDING}px`, 'important');
		containerElement.style.setProperty('overflow', 'hidden', 'important');
		containerElement.style.setProperty('margin', '0', 'important');
		containerElement.style.setProperty('box-sizing', 'border-box', 'important');
		containerElement.classList.add(...classList);
		containerElement.dataset.bgeComponent = 'editable-area';
		frameDoc.body.append(containerElement);

		// コンテンツの実サイズにiframeの高さを追従させる
		if (typeof ResizeObserver !== 'undefined') {
			const observer = new ResizeObserver(() => {
				requestAnimationFrame(() => {
					setHeight(
						containerElement.getBoundingClientRect().height + CONTAINER_PADDING * 2,
					);
				});
			});
			observer.observe(containerElement);
			resizeObserverRef.current = observer;
		}

		setFrameBody(frameDoc.body);
		onReady({ containerElement, animateInsertion });
	};

	useEffect(() => {
		return () => {
			resizeObserverRef.current?.disconnect();
		};
	}, []);

	useEffect(() => {
		const onSwitch = (e: CustomEvent<{ readonly content: EditableAreaType }>) => {
			setActive(e.detail.content === type);
		};
		const onSaved = (
			e: CustomEvent<{ readonly main: string; readonly draft?: string }>,
		) => {
			const value = type === 'main' ? e.detail.main : (e.detail.draft ?? '');
			setSourceText(value);
			setIsEmpty(value.trim() === '');
		};
		engine.el.addEventListener('bge:switch-content', onSwitch);
		engine.el.addEventListener('bge:saved', onSaved);
		return () => {
			engine.el.removeEventListener('bge:switch-content', onSwitch);
			engine.el.removeEventListener('bge:saved', onSaved);
		};
	}, [engine, type]);

	const sourceTextRef = useRef(sourceText);
	useEffect(() => {
		sourceTextRef.current = sourceText;
	});

	// textareaの表示値だけでなくisEmptyもコンテンツの実際の状態に揃える。
	// ここを揃えないと、ソース編集で空にした直後にビジュアルモードへ戻って
	// も初期挿入ボタンが復活しない（次のbge:savedまで固着する）
	const syncFromContent = (
		content: NonNullable<ReturnType<typeof engine.getEditableContent>>,
	) => {
		const value = content.getContentsAsString();
		setSourceText(value);
		setIsEmpty(value.trim() === '');
	};

	// ソースモードに入るときはコンテンツから最新のHTMLを引き直し、
	// 抜けるときはtextareaの内容をコンテンツへコミットする。uiState
	// ストアの購読コールバックで遷移を検知してReact stateを更新する
	useEffect(() => {
		let prevSourceMode = engine.uiState.getSnapshot().sourceMode[type];
		return engine.uiState.subscribe(() => {
			const nextSourceMode = engine.uiState.getSnapshot().sourceMode[type];
			if (nextSourceMode === prevSourceMode) {
				return;
			}
			prevSourceMode = nextSourceMode;
			const content = engine.getEditableContent(type);
			if (nextSourceMode) {
				setSourceText(content?.getContentsAsString() ?? '');
			} else if (content) {
				commitEditableAreaSource(engine, type, sourceTextRef.current, syncFromContent);
			}
		});
	}, [engine, type]);

	const commitSource = (value: string) => {
		commitEditableAreaSource(engine, type, value, syncFromContent);
	};

	return (
		<div
			data-bge-component={`${type}-editable-area`}
			data-bge-component-mode={sourceMode ? 'source' : 'visual'}
			hidden={!active}>
			<textarea
				aria-label="HTMLソース"
				spellCheck={false}
				hidden={!sourceMode}
				disabled={!sourceMode}
				value={sourceText}
				onChange={(e) => setSourceText(e.currentTarget.value)}
				onBlur={(e) => commitSource(e.currentTarget.value)}
			/>
			{/* src無しでcontentDocumentを直接組み立てるためloadingは実質無関係
			    （lintの要求に合わせてlazyを明示） */}
			<iframe
				title={type === 'main' ? '本稿の編集エリア' : '下書きの編集エリア'}
				loading="lazy"
				style={{ inlineSize: '100%', overflow: 'hidden' }}
				height={height}
				hidden={sourceMode}
				ref={initFrame}
			/>
			{frameBody
				? createPortal(
						<>
							<div data-bge-component="block-menu">
								<BlockMenu engine={engine} container={frameBody} />
							</div>
							<div
								data-bge-component="initial-insertion"
								hidden={!(isEmpty && !processing && !dialogOpen)}>
								<InitialInsertionButton />
							</div>
						</>,
						frameBody,
					)
				: null}
		</div>
	);
}
