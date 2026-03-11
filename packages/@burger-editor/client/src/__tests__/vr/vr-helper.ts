// @ts-expect-error -- vite ?raw import
import uiCss from '../../style/ui.css?raw';

/**
 *
 */
export function injectCSS(): void {
	const style = document.createElement('style');
	style.textContent = uiCss as string;
	document.head.append(style);

	const stabilize = document.createElement('style');
	stabilize.textContent =
		'* { animation: none !important; transition: none !important; }';
	document.head.append(stabilize);
}

/**
 *
 * @param innerHtml
 */
export function renderDialog(innerHtml: string): HTMLDialogElement {
	const dialog = document.createElement('dialog');
	const div = document.createElement('div');
	const form = document.createElement('form');
	form.innerHTML = innerHtml;
	div.append(form);

	const footer = document.createElement('footer');
	footer.innerHTML = '<button type="button">OK</button>';

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
