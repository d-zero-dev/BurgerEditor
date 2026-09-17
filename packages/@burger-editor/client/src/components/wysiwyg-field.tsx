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
				// プロパティとして渡す（属性ではない） — React 19はカスタム
				// 要素の既知プロパティにマッチする名前をelement[name] = value
				// で設定する
				contentCss?: string;
			};
		}
	}
}

type Thenable<T> = Promise<T> & {
	status?: 'fulfilled' | 'rejected';
	value?: T;
	reason?: unknown;
};

/**
 * Wrap `promise` so a rejection resolves to `fallback` instead, without
 * breaking the `use()` cache contract (react.dev's `wrapPromise` pattern:
 * a thenable tagged with `.status`/`.value`/`.reason` lets `use()` read it
 * synchronously on the first render). `Promise.prototype.catch()` always
 * returns a fresh, untagged promise, so chaining it directly onto an
 * already-tagged thenable would silently drop that fast path. A tagged
 * `'fulfilled'` promise is returned as-is (nothing to fall back from); a
 * tagged `'rejected'` promise is converted synchronously; only a genuinely
 * untagged promise falls back to the real async `.catch()`.
 * @param promise - Source promise, optionally pre-tagged per the `use()`
 * cache contract
 * @param fallback - Value to resolve to when `promise` rejects
 */
function withFallback<T>(promise: Promise<T>, fallback: T): Promise<T> {
	const tagged = promise as Thenable<T>;
	if (tagged.status === 'fulfilled') {
		return promise;
	}
	if (tagged.status === 'rejected') {
		const resolved = Promise.resolve(fallback) as Thenable<T>;
		resolved.status = 'fulfilled';
		resolved.value = fallback;
		return resolved;
	}
	return promise.catch(() => fallback);
}

/**
 * Rich text field backed by the `<bge-wysiwyg-editor>` custom element
 * (TipTap). The element manages its own DOM; this wrapper feeds the
 * initial value and lifts edits into the editor state via the
 * `transaction` event — subscribed directly on the host element (the
 * event is dispatched with `bubbles: true` on the inner `<bge-wysiwyg>`,
 * so it reaches here without needing to query into it).
 *
 * Content CSS (so the WYSIWYG surface matches the published page's
 * styling) is fetched once per engine via `use()` — only an item whose
 * `Editor` actually renders `WysiwygField` pays for this fetch/suspend,
 * unlike hoisting it to the item-editor host for every item — and
 * passed as the `contentCss` property (React 19 sets it directly on the
 * element, replacing an imperative `el.setStyle()` call).
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
	// 間だけ安定させる（遅延初期化のuseState）。CSS取得の失敗（ネットワーク
	// 不調・パス誤り等）は「見た目が多少崩れる」程度で済むべき失敗であり、
	// use()にrejectをそのまま投げさせるとダイアログ全体のErrorBoundaryまで
	// 伝播しフォーム全体が使用不能になってしまう（旧・命令的fire-and-forget
	// 実装からの挙動後退）ため、ここで吸収して空文字列にフォールバックする。
	// `.catch()`は常に新しい（タグなしの）Promiseを返すため、素朴に繋ぐと
	// use()キャッシュ契約（react.devのwrapPromiseパターン、.status/.value）
	// で既にfulfilledタグ済みのPromiseを渡された場合の同期返却パスまで
	// 壊してしまう — withCssFallbackはタグを見て、タグ済みならそのまま
	// 通し、未タグ（実運用のPromise）のときだけ実際に.catch()する
	const [contentCssPromise] = useState(() =>
		withFallback(engine.getContentStylesheet(), ''),
	);
	const contentCss = use(contentCssPromise);

	const ref = useRef<BgeWysiwygEditorElement | null>(null);
	const initialValue = useRef(value);
	const onTransaction = useEffectEvent((el: BgeWysiwygEditorElement) => {
		onChange(el.value);
	});

	// 初期値の書き込みだけは今も命令的 — contentEditableベースのリッチ
	// テキストエディタをvalueで都度制御すると、入力中にカーソル位置が
	// 飛ぶ（Reactが明示的に警告するアンチパターン）。以降の値はTipTap
	// 自身が保持し、`transaction`イベント経由でこの外へ伝わる
	useEffect(() => {
		const el = ref.current;
		if (!el) {
			return;
		}
		// custom element側のinnerHTMLセッターがwysiwygのvalueに転送する
		el.innerHTML = initialValue.current;

		const listener = () => onTransaction(el);
		el.addEventListener('transaction', listener);
		return () => {
			el.removeEventListener('transaction', listener);
		};
	}, []);

	return (
		<bge-wysiwyg-editor
			ref={(el: HTMLElement | null) => {
				ref.current = el as BgeWysiwygEditorElement | null;
			}}
			contentCss={contentCss}
			item-name={itemName}
			commands={commands}
			label={label}
		/>
	);
}
