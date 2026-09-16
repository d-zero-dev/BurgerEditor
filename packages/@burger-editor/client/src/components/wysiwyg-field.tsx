import type { BgeWysiwygEditorElement } from '@burger-editor/custom-element';

import { use, useEffect, useEffectEvent, useRef, useState } from 'react';

import { useEngine } from '../engine-context.js';

declare module 'react' {
	namespace JSX {
		interface IntrinsicElements {
			'bge-wysiwyg-editor': React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement>,
				HTMLElement
			> & {
				'item-name'?: string;
				commands?: string;
				label?: string;
				name?: string;
			};
		}
	}
}

/**
 * Rich text field backed by the `<bge-wysiwyg-editor>` custom element
 * (TipTap). The element manages its own DOM; this wrapper feeds the
 * initial value and lifts edits into the editor state via the
 * `transaction` event.
 *
 * Content CSS (so the WYSIWYG surface matches the published page's
 * styling) is fetched once per engine via `use()` — only an item whose
 * `Editor` actually renders `WysiwygField` pays for this fetch/suspend,
 * unlike hoisting it to the item-editor host for every item.
 * @param root0
 * @param root0.value
 * @param root0.onChange
 * @param root0.itemName
 * @param root0.commands
 * @param root0.label
 * @example
 * ```tsx
 * <WysiwygField
 * 	itemName="wysiwyg"
 * 	value={state.wysiwyg ?? ''}
 * 	onChange={(wysiwyg) => setState({ ...state, wysiwyg })}
 * />
 * ```
 */
export function WysiwygField({
	value,
	onChange,
	itemName,
	commands,
	label,
}: {
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly itemName?: string;
	readonly commands?: string;
	readonly label?: string;
}) {
	const engine = useEngine();
	// レンダーごとに新しいPromiseを作るとuse()が「キャッシュされていない
	// Promise」として毎回サスペンドし直すため、このコンポーネント寿命の
	// 間だけ安定させる（遅延初期化のuseState）
	const [contentCssPromise] = useState(() => engine.getContentStylesheet());
	const contentCss = use(contentCssPromise);

	const ref = useRef<BgeWysiwygEditorElement | null>(null);
	const initialValue = useRef(value);
	const onTransaction = useEffectEvent((el: BgeWysiwygEditorElement) => {
		onChange(el.value);
	});

	useEffect(() => {
		const el = ref.current;
		if (!el) {
			return;
		}
		// custom element側のinnerHTMLセッターがwysiwygのvalueに転送する
		el.innerHTML = initialValue.current;
		el.setStyle(contentCss);

		// transactionはバブリングしないため内側の要素で購読する
		const inner = el.querySelector('bge-wysiwyg');
		const listener = () => onTransaction(el);
		inner?.addEventListener('transaction', listener);
		return () => {
			inner?.removeEventListener('transaction', listener);
		};
		// contentCssはuse()でサスペンド解決済みの値 — このコンポーネント
		// インスタンスの生存期間中に変わることはなく、実質マウント時1回だけ
		// 走る（exhaustive-depsを満たすため依存配列には含める）
	}, [contentCss]);

	return (
		<bge-wysiwyg-editor
			ref={(el: HTMLElement | null) => {
				ref.current = el as BgeWysiwygEditorElement | null;
			}}
			item-name={itemName}
			commands={commands}
			label={label}
		/>
	);
}
