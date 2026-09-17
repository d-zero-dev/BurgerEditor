import type { BurgerEditorEngine } from '@burger-editor/core';

import { cleanup, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { test, expect, describe, beforeAll, afterEach, vi } from 'vitest';

import { EngineProvider } from '../engine-context.js';

import { WysiwygField } from './wysiwyg-field.js';

afterEach(cleanup);

/**
 * 実際のtiptapベースのbge-wysiwyg-editorを使わず、`contentCss`プロパティの
 * 受け取りだけを観測できる最小限のカスタム要素スタブ。実物の
 * `BgeWysiwygEditorElement`と同じく、`contentCss`はプロパティ（React 19が
 * カスタム要素へ直接設定する）として渡ってくる契約
 */
class StubWysiwygEditorElement extends HTMLElement {
	setStyle = vi.fn();
	value = '';

	get contentCss(): string | null {
		return this.setStyle.mock.lastCall?.[0] ?? null;
	}
	set contentCss(css: string) {
		this.setStyle(css);
	}
}

beforeAll(() => {
	if (!customElements.get('bge-wysiwyg-editor')) {
		customElements.define('bge-wysiwyg-editor', StubWysiwygEditorElement);
	}
});

/**
 * getContentStylesheetが解決しないPromiseを返すengineモックを作る。
 * fallback表示・unmount安全性など、実際にSuspenseの再開（Scheduler経由の
 * リトライ）を必要としないケースの検証に使う（`render()`外で解決した
 * thenableに対するReactの自動retry pingは、実Chromium/Vitest Browser
 * Modeでも安定して再開しないことを最小再現で確認済み — jsdom固有の
 * 制約ではない。そのため「pendingのまま」か「最初から解決済み」の
 * どちらかで検証する）
 */
function createPendingHarness() {
	const getContentStylesheet = vi.fn<() => Promise<string>>().mockReturnValue(
		new Promise(() => {
			/* 意図的に解決しない */
		}),
	);
	const engine = { getContentStylesheet } as unknown as BurgerEditorEngine;
	return { engine, getContentStylesheet };
}

/**
 * getContentStylesheetが「最初から解決済み」のthenableを返すengineモックを
 * 作る。use()はthenable.statusが'fulfilled'であれば最初のレンダーで
 * サスペンドせず同期的に値を返す（react.devの `wrapPromise` キャッシュ
 * パターンと同じthenable拡張）。Suspenseの再開そのもの（pending →
 * fulfilledへの遷移をReactのSchedulerが拾ってリトライする過程）は
 * 実ブラウザでも自動では再開しないため検証できない。ここでは
 * 「解決済みの値がsetStyleに渡る」という契約だけを確認する
 * @param css - `use()` が同期的に返す値
 */
function createResolvedHarness(css: string) {
	const resolved = Promise.resolve(css) as Promise<string> & {
		status?: 'fulfilled';
		value?: string;
	};
	resolved.status = 'fulfilled';
	resolved.value = css;
	const getContentStylesheet = vi.fn<() => Promise<string>>().mockReturnValue(resolved);
	const engine = { getContentStylesheet } as unknown as BurgerEditorEngine;
	return { engine };
}

describe('WysiwygField — コンテンツスタイルシート注入（use() + Suspense）', () => {
	test('未解決の間はSuspenseのfallbackが表示され、custom elementはまだマウントされない', () => {
		const { engine } = createPendingHarness();

		render(
			<EngineProvider engine={engine}>
				<Suspense fallback={<p>loading</p>}>
					<WysiwygField value="" onChange={() => {}} />
				</Suspense>
			</EngineProvider>,
		);

		expect(screen.getByText('loading')).toBeTruthy();
		expect(document.querySelector('bge-wysiwyg-editor')).toBeNull();
	});

	test('解決済みの値でマウントされるとsetStyleが呼ばれ、fallbackは消える', () => {
		const { engine } = createResolvedHarness('body{color:red}');

		render(
			<EngineProvider engine={engine}>
				<Suspense fallback={<p>loading</p>}>
					<WysiwygField value="" onChange={() => {}} />
				</Suspense>
			</EngineProvider>,
		);

		const stub = document.querySelector<StubWysiwygEditorElement>('bge-wysiwyg-editor');
		expect(stub?.setStyle).toHaveBeenCalledWith('body{color:red}');
		expect(screen.queryByText('loading')).toBeNull();
	});

	test('未解決のまま unmount されてもsetStyleを呼びようがない（要素自体が存在しない）', () => {
		const { engine } = createPendingHarness();

		const { unmount } = render(
			<EngineProvider engine={engine}>
				<Suspense fallback={<p>loading</p>}>
					<WysiwygField value="" onChange={() => {}} />
				</Suspense>
			</EngineProvider>,
		);

		expect(document.querySelector('bge-wysiwyg-editor')).toBeNull();
		unmount();
		expect(document.querySelector('bge-wysiwyg-editor')).toBeNull();
	});
});

describe('WysiwygField — transactionイベントからonChangeへの伝達', () => {
	test('初期値がinnerHTML経由でカスタム要素へ書き込まれる', () => {
		const { engine } = createResolvedHarness('');
		const initialValue = ['<', 'p', '>', '初期値', '<', '/p', '>'].join('');

		render(
			<EngineProvider engine={engine}>
				<Suspense fallback={<p>loading</p>}>
					<WysiwygField value={initialValue} onChange={() => {}} />
				</Suspense>
			</EngineProvider>,
		);

		const stub = document.querySelector('bge-wysiwyg-editor');
		expect(stub?.innerHTML).toBe(initialValue);
	});

	test('ホスト要素で受け取ったtransactionイベントがonChange(el.value)を呼ぶ', () => {
		// 退行防止: onTransactionをJSXの `on*` プロパティとして渡す実装は
		// カスタム要素へイベントリスナーとして登録されず(React 19はここでは
		// プロパティ/属性としてしか扱わない)、無音で伝達が壊れていた。
		// addEventListener('transaction', ...) による購読で検証する
		const { engine } = createResolvedHarness('');
		const onChange = vi.fn();

		render(
			<EngineProvider engine={engine}>
				<Suspense fallback={<p>loading</p>}>
					<WysiwygField value="" onChange={onChange} />
				</Suspense>
			</EngineProvider>,
		);

		const stub = document.querySelector<StubWysiwygEditorElement>('bge-wysiwyg-editor')!;
		stub.value = '<p>編集後</p>';
		stub.dispatchEvent(new CustomEvent('transaction', { bubbles: true }));

		expect(onChange).toHaveBeenCalledWith('<p>編集後</p>');
	});
});
