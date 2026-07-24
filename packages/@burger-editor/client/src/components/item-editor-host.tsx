import type {
	BurgerEditorEngine,
	Item,
	ItemData,
	ItemEditorProps,
} from '@burger-editor/core';
import type { BgeWysiwygEditorElement } from '@burger-editor/custom-element';
import type { ComponentType, RefObject } from 'react';

import { useEffect, useRef, useState } from 'react';

import { EditorDialog } from '../editor-dialog.js';

type AnyItem = Item<ItemData, {}>;
type SubmitRef = RefObject<(() => Promise<void>) | null>;

/**
 * Declarative item editor dialog. Renders the item's `Editor` component
 * with editor state derived via `toEditorState`; on submit the state is
 * converted back with `toItemData` and imported into the item.
 * @param root0
 * @param root0.engine
 * @param root0.item
 * @example
 * ```tsx
 * <ItemEditorHost
 * 	engine={engine}
 * 	item={open?.type === 'item-editor' ? open.item : null}
 * />
 * ```
 */
export function ItemEditorHost({
	engine,
	item,
}: {
	readonly engine: BurgerEditorEngine;
	readonly item: AnyItem | null;
}) {
	const submitRef: SubmitRef = useRef(null);

	return (
		<EditorDialog
			name="item-editor"
			open={!!item}
			buttons={{ close: 'キャンセル', complete: '決定' }}
			onClose={() => {
				engine.uiState.closeDialog();
				engine.save();
			}}
			onComplete={() => {
				void (async () => {
					await submitRef.current?.();
					engine.uiState.closeDialog();
				})();
			}}>
			{item ? <ItemEditorBody engine={engine} item={item} submitRef={submitRef} /> : null}
		</EditorDialog>
	);
}

/**
 * The editor form body. Owns the editor state for the currently edited
 * item.
 * @param root0
 * @param root0.engine
 * @param root0.item
 * @param root0.submitRef
 */
function ItemEditorBody({
	engine,
	item,
	submitRef,
}: {
	readonly engine: BurgerEditorEngine;
	readonly item: AnyItem;
	readonly submitRef: SubmitRef;
}) {
	const seed = item.seed;

	const [state, setState] = useState<ItemData>(() => {
		const data = item.export();
		return seed.toEditorState ? seed.toEditorState(data, engine.config) : data;
	});

	const stateRef = useRef(state);
	useEffect(() => {
		stateRef.current = state;
	});

	useEffect(() => {
		submitRef.current = async () => {
			const data = seed.toItemData
				? await seed.toItemData(stateRef.current, engine.config)
				: stateRef.current;
			await item.import(data);
		};
		return () => {
			submitRef.current = null;
		};
	}, [engine, item, seed, submitRef]);

	// wysiwygエディタへコンテンツ用スタイルシートを注入する
	const wrapperRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const wysiwyg =
			wrapperRef.current?.querySelector<BgeWysiwygEditorElement>('bge-wysiwyg-editor');
		if (!wysiwyg) {
			return;
		}
		void engine.getContentStylesheet().then((css) => {
			wysiwyg.setStyle(css);
		});
	}, [engine, item]);

	const containerType =
		item.el.closest<HTMLDivElement>('[data-bge-container]')?.dataset['bgeContainer'];

	const Editor = seed.Editor as ComponentType<ItemEditorProps> | undefined;

	if (!Editor) {
		return (
			<p>編集できないコンテンツです (Error: Editor not found: &quot;{item.name}&quot;)</p>
		);
	}

	return (
		<div ref={wrapperRef} data-bge-container={containerType}>
			<Editor
				state={state}
				setState={setState}
				config={engine.config}
				engine={engine}
				item={item}
			/>
		</div>
	);
}
