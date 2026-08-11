import type { ClientRequestOptions } from 'hono';
import type { ClientResponse } from 'hono/client';
import type { StatusCode } from 'hono/utils/http-status';

/**
 * `request.$post` is only used to derive the upload URL; the actual request runs
 * through `XMLHttpRequest` for progress events, so its response type is untyped here.
 * `R` (the success JSON shape) must be supplied explicitly by the caller, since
 * `zValidator` makes the route's real response a success/validation-error union that
 * can't be inferred as a single type.
 * @param request
 * @param request.$post
 * @param request.$url
 */
export function $upload<D extends Record<string, unknown>, R>(request: {
	$post: (
		args: { form: D },
		options?: ClientRequestOptions<unknown>,
	) => Promise<ClientResponse<unknown, StatusCode, 'json'>>;

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
