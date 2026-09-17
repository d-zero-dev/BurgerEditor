// @ts-expect-error -- vite ?raw import
import uiCss from '../../style/ui.css?raw';

/**
 *
 */
export function injectCSS(): void {
	const style = document.createElement('style');
	style.textContent = uiCss;
	document.head.append(style);

	const stabilize = document.createElement('style');
	stabilize.textContent =
		'* { animation: none !important; transition: none !important; }';
	document.head.append(stabilize);
}

/**
 * `EditorDialog`（editor-dialog.tsx）が実際に描画する
 * `dialog.bge-dialog > div > form > div` + `footer` の骨格を再現する。
 * footerはキャンセル・決定の2ボタン構成（`ui.css`の`footer { gap }`は
 * ボタン数で見え方が変わる）、formにはエラー行（`role="alert"`）を
 * 追加できるようにして、実マークアップとの乖離を防ぐ
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
	dialog.showModal();
	return dialog;
}

/**
 *
 * @param html
 */
export function renderElement(html: string): HTMLElement {
	const container = document.createElement('div');
	container.innerHTML = html;
	document.body.append(container);
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

/**
 *
 */
export function cleanUp(): void {
	for (const dialog of document.querySelectorAll('dialog')) {
		if (dialog.open) {
			dialog.close();
		}
		dialog.remove();
	}
	document.body.innerHTML = '';
	for (const s of document.head.querySelectorAll('style')) {
		s.remove();
	}
}
