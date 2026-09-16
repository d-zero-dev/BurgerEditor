import type { Item, ItemData, ItemEditorProps } from '@burger-editor/core';
import type { ComponentType, RefObject } from 'react';

import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { EditorDialog } from '../editor-dialog.js';
import { useEngine } from '../engine-context.js';

type AnyItem = Item<ItemData, {}>;
type SubmitRef = RefObject<(() => Promise<void>) | null>;

/**
 * Declarative item editor dialog. Renders the item's `Editor` component
 * with editor state derived via `toEditorState`; on submit the state is
 * converted back with `toItemData` and imported into the item. Reads the
 * engine via {@link useEngine}.
 * @param root0
 * @param root0.item
 * @example
 * ```tsx
 * <ItemEditorHost item={open?.type === 'item-editor' ? open.item : null} />
 * ```
 */
export function ItemEditorHost({ item }: { readonly item: AnyItem | null }) {
	const engine = useEngine();
	const submitRef: SubmitRef = useRef(null);

	const closeAndSave = () => {
		engine.uiState.closeDialog();
		engine.save();
	};

	return (
		<EditorDialog
			name="item-editor"
			open={!!item}
			buttons={{ close: 'キャンセル', complete: '決定' }}
			onClose={closeAndSave}
			action={async () => {
				// submitRef.current()がthrowした場合はEditorDialogの
				// useActionStateがcatchしrole="alert"で表示する。ここでは
				// 早期returnせず、以降のclose/saveを実行させない
				await submitRef.current?.();
				closeAndSave();
			}}>
			{item ? <ItemEditorBody item={item} submitRef={submitRef} /> : null}
		</EditorDialog>
	);
}

/**
 * The editor form body. Owns the editor state for the currently edited
 * item.
 * @param root0
 * @param root0.item
 * @param root0.submitRef
 */
function ItemEditorBody({
	item,
	submitRef,
}: {
	readonly item: AnyItem;
	readonly submitRef: SubmitRef;
}) {
	const engine = useEngine();
	const seed = item.seed;

	const [state, setState] = useState<ItemData>(() => {
		const data = item.export();
		return seed.toEditorState ? seed.toEditorState(data, engine.config) : data;
	});

	// 最新のstateでtoItemDataを呼ぶ。useEffectEventなのでeffect自体は
	// item/seed/engineが変わったとき（＝アイテム切替時）だけ作り直され、
	// キー入力のたびのstate更新では作り直されない
	const resolveSubmitData = useEffectEvent(async () => {
		return seed.toItemData ? await seed.toItemData(state, engine.config) : state;
	});

	useEffect(() => {
		submitRef.current = async () => {
			const data = await resolveSubmitData();
			await item.import(data);
		};
		return () => {
			submitRef.current = null;
		};
	}, [item, submitRef]);

	const containerType =
		item.el.closest<HTMLDivElement>('[data-bge-container]')?.dataset['bgeContainer'];

	const Editor = seed.Editor as ComponentType<ItemEditorProps> | undefined;

	if (!Editor) {
		return (
			<p>編集できないコンテンツです (Error: Editor not found: &quot;{item.name}&quot;)</p>
		);
	}

	return (
		<div data-bge-container={containerType}>
			<Editor state={state} setState={setState} item={item} />
		</div>
	);
}
