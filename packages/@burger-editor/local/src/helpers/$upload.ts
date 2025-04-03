import type { ClientRequestOptions } from 'hono';
import type { ClientResponse } from 'hono/client';
import type { StatusCode } from 'hono/utils/http-status';

/**
 *
 * @param request
 * @param request.$post
 * @param request.$url
 */
export function $upload<D extends Record<string, unknown>, R>(request: {
	$post: (
		args: { form: D },
		options?: ClientRequestOptions<unknown>,
	) => Promise<ClientResponse<R, StatusCode, 'json'>>;

	$url: (arg?: {} | undefined) => URL;
}) {
	const url = request.$url({});

	return async (
		args: D,
		progress?: (uploaded: number, total: number) => Promise<void> | void,
	): Promise<R> => {
		const xhr = new XMLHttpRequest();
		xhr.open('POST', url);

		const formData = new FormData();
		for (const [key, value] of Object.entries(args)) {
			formData.append(key, value as string);
		}

		if (progress) {
			xhr.upload.addEventListener('progress', (e) => {
				void progress(e.loaded, e.total);
			});
		}

		return new Promise<R>((resolve) => {
			xhr.addEventListener('load', () => {
				if (xhr.status < 400) {
					resolve(JSON.parse(xhr.responseText));
				}
			});

			xhr.send(formData);
		});
	};
}
