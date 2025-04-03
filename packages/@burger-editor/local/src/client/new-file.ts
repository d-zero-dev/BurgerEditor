/**
 *
 */
export function newFile() {
	const form = document.getElementById('new-file-form');
	if (!form) {
		return;
	}

	form.addEventListener('submit', async (e) => {
		e.preventDefault();

		const formData = new FormData(e.currentTarget as HTMLFormElement);
		const pathData = formData.get('path');
		const path = typeof pathData === 'string' ? pathData : await pathData?.text();

		let savePath = path?.trim().replaceAll(/^\/|\.\.\//g, '') ?? '';

		if (savePath === '') {
			return;
		}

		if (!savePath.endsWith('.html')) {
			savePath += '.html';
		}

		globalThis.location.href = `/${savePath}`;
	});
}
