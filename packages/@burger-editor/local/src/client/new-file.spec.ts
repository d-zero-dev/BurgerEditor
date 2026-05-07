import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { newFile } from './new-file.js';

type CapturedRequest = { url: string; init: RequestInit | undefined };

/**
 *
 * @param virtualTreeEnabled
 */
function setupForm(virtualTreeEnabled: boolean): HTMLFormElement {
	document.body.innerHTML = `
		<input type="hidden" id="virtual-tree-enabled" value="${virtualTreeEnabled}" />
		<form id="new-file-form" method="dialog">
			<label><span>File path</span><input type="text" name="path" /></label>
			${virtualTreeEnabled ? '<label><span>File ID</span><input type="text" name="id" /></label>' : ''}
		</form>
	`;
	return document.getElementById('new-file-form') as HTMLFormElement;
}

describe('newFile (virtualTree disabled)', () => {
	const navigate = vi.fn<(url: string) => void>();
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		navigate.mockReset();
		fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response('{}', { status: 200 }));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('navigates to /<path>.html on submit without calling the create API', async () => {
		const form = setupForm(false);
		(form.elements.namedItem('path') as HTMLInputElement).value = 'foo/bar';
		newFile(navigate);

		form.dispatchEvent(new Event('submit', { cancelable: true }));
		await vi.waitFor(() => {
			expect(navigate).toHaveBeenCalledExactlyOnceWith('/foo/bar.html');
		});
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	test('strips leading slash and parent traversal segments from the path', async () => {
		const form = setupForm(false);
		(form.elements.namedItem('path') as HTMLInputElement).value = '/../foo/bar.html';
		newFile(navigate);

		form.dispatchEvent(new Event('submit', { cancelable: true }));
		await vi.waitFor(() => {
			expect(navigate).toHaveBeenCalledExactlyOnceWith('/foo/bar.html');
		});
	});

	test('does not navigate when path is empty', async () => {
		const form = setupForm(false);
		(form.elements.namedItem('path') as HTMLInputElement).value = '';
		newFile(navigate);

		form.dispatchEvent(new Event('submit', { cancelable: true }));
		// Give the async submit handler a chance to run.
		await new Promise((r) => setTimeout(r, 20));
		expect(navigate).not.toHaveBeenCalled();
	});
});

describe('newFile (virtualTree enabled)', () => {
	const navigate = vi.fn<(url: string) => void>();
	const fetchCalls: CapturedRequest[] = [];
	let alertSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		navigate.mockReset();
		fetchCalls.length = 0;
		alertSpy = vi
			.spyOn(globalThis, 'alert')
			.mockImplementation(() => undefined as unknown as void);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	/**
	 *
	 * @param status
	 * @param body
	 */
	function mockCreateApi(status: number, body: unknown = {}) {
		vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
			const url = typeof input === 'string' ? input : (input as Request).url;
			fetchCalls.push({ url, init });
			return Promise.resolve(
				Response.json(body, {
					status,
					headers: { 'content-type': 'application/json' },
				}),
			);
		});
	}

	test('alerts and stays put when id is empty', async () => {
		const form = setupForm(true);
		(form.elements.namedItem('path') as HTMLInputElement).value = 'about.html';
		(form.elements.namedItem('id') as HTMLInputElement).value = '';
		mockCreateApi(200);
		newFile(navigate);

		form.dispatchEvent(new Event('submit', { cancelable: true }));
		await vi.waitFor(() => {
			expect(alertSpy).toHaveBeenCalledTimes(1);
		});
		expect(fetchCalls).toHaveLength(0);
		expect(navigate).not.toHaveBeenCalled();
	});

	test('POSTs id and path to /api/content/create and navigates on success', async () => {
		const form = setupForm(true);
		(form.elements.namedItem('path') as HTMLInputElement).value = 'foo/about';
		(form.elements.namedItem('id') as HTMLInputElement).value = '42';
		mockCreateApi(200);
		newFile(navigate);

		form.dispatchEvent(new Event('submit', { cancelable: true }));
		await vi.waitFor(() => {
			expect(navigate).toHaveBeenCalledExactlyOnceWith('/foo/about.html');
		});

		expect(fetchCalls).toHaveLength(1);
		expect(fetchCalls[0]?.url).toMatch(/\/api\/content\/create$/);
		const body = JSON.parse(String(fetchCalls[0]?.init?.body)) as Record<string, string>;
		expect(body).toEqual({ id: '42', path: 'foo/about.html' });
	});

	test('alerts the server error message and does not navigate when create fails', async () => {
		const form = setupForm(true);
		(form.elements.namedItem('path') as HTMLInputElement).value = 'about.html';
		(form.elements.namedItem('id') as HTMLInputElement).value = '5.html';
		mockCreateApi(409, {
			error: 'File ID "5.html" is already in use (currently mapped to "about.html").',
		});
		newFile(navigate);

		form.dispatchEvent(new Event('submit', { cancelable: true }));
		await vi.waitFor(() => {
			expect(alertSpy).toHaveBeenCalledTimes(1);
		});

		expect(alertSpy).toHaveBeenCalledWith(
			expect.stringMatching(/File ID "5\.html" is already in use/),
		);
		expect(navigate).not.toHaveBeenCalled();
	});
});
