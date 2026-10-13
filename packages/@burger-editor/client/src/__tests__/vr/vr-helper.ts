/**
 * VRテスト用のDOM組み立てヘルパー。
 *
 * 各ヘルパーは追加した要素の除去を、呼び出し元テストの終了時に
 * `onTestFinished` で予約する。そのためテストの実行中（`beforeEach` を
 * 含む）にのみ呼べ、`beforeAll` やモジュール直下からは呼べない。
 * 文書を丸ごと空にする後片付けは、テストランナーや他のコードが置いた
 * 要素・スタイルまで巻き込むため使わない
 */
import { onTestFinished } from 'vitest';

// @ts-expect-error -- vite ?raw import
import uiCss from '../../style/ui.css?raw';

/**
 * `ui.css` とアニメーション無効化のスタイルを head に追加する。
 * テストの終了時に取り除かれる
 */
export function injectCSS(): void {
	const style = document.createElement('style');
	style.textContent = uiCss;
	document.head.append(style);
	onTestFinished(() => style.remove());

	const stabilize = document.createElement('style');
	stabilize.textContent =
		'* { animation: none !important; transition: none !important; }';
	document.head.append(stabilize);
	onTestFinished(() => stabilize.remove());
}

/**
 * `EditorDialog`（editor-dialog.tsx）が実際に描画する
 * `dialog.bge-dialog > div > form > div` + `footer` の骨格を再現する。
 * footerはキャンセル・決定の2ボタン構成（`ui.css`の`footer { gap }`は
 * ボタン数で見え方が変わる）、formにはエラー行（`role="alert"`）を
 * 追加できるようにして、実マークアップとの乖離を防ぐ。
 * ダイアログはテストの終了時に取り除かれる
 * @param innerHtml
 * @param options
 * @param options.error - 確定ボタン押下後のエラー文言（`role="alert"`の行を追加する）
 */
export function renderDialog(
	innerHtml: string,
	options?: { readonly error?: string },
): HTMLDialogElement {
	const dialog = document.createElement('dialog');
	dialog.className = 'bge-dialog';
	const div = document.createElement('div');
	const form = document.createElement('form');
	const body = document.createElement('div');
	body.innerHTML = innerHtml;
	form.append(body);
	if (options?.error !== undefined) {
		const error = document.createElement('p');
		error.setAttribute('role', 'alert');
		error.textContent = options.error;
		form.append(error);
	}
	div.append(form);

	const footer = document.createElement('footer');
	footer.innerHTML =
		'<button type="button">キャンセル</button><button type="submit" aria-busy="false">決定</button>';

	dialog.append(div);
	dialog.append(footer);
	document.body.append(dialog);
	// 文書から外せばモーダルの最前面表示も解除されるため、close()は不要
	onTestFinished(() => dialog.remove());
	dialog.showModal();
	return dialog;
}

/**
 * 渡したHTMLを包む `<div>` を body に追加する。テストの終了時に取り除かれる
 * @param html
 */
export function renderElement(html: string): HTMLElement {
	const container = document.createElement('div');
	container.innerHTML = html;
	document.body.append(container);
	onTestFinished(() => container.remove());
	return container;
}

/**
 *
 */
export function waitForRender(): Promise<void> {
	return new Promise((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				resolve();
			});
		});
	});
}
