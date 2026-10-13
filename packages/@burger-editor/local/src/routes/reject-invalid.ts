import type { Context } from 'hono';

/**
 * Body of the 400 response sent when a `zValidator` target fails validation.
 * Describes only the part of zod's `ZodSafeParseError` the wire format carries.
 */
export interface ValidationFailureBody {
	readonly success: false;
	readonly target: string;
	readonly data: unknown;
	/** `message` is the JSON-stringified list of zod issues. */
	readonly error: { readonly name: string; readonly message: string };
}

/**
 * `zValidator` hook that answers a failed validation with the same 400 body
 * as `@hono/zod-validator`'s default (`c.json(result, 400)`), but typed as
 * {@link ValidationFailureBody}.
 *
 * Why not leave the default: its response type is `ZodSafeParseError<...>`,
 * which since zod 4.6 pulls `zod/v4/core/json-schema` into the route types.
 * That module is not reachable through zod's `exports`, so declaration emit of
 * `createApp` (and every sub-app) fails with TS2742.
 * @param result zod-validator's parse result; only `success` is read, the rest is sent as is
 * @param result.success whether the target passed validation
 * @param c the request context used to build the 400 response
 * @example
 * app.post('/x', zValidator('json', schema, rejectInvalid), (c) => c.json({ ok: true }));
 */
export function rejectInvalid(result: { readonly success: boolean }, c: Context) {
	if (result.success) {
		return;
	}
	return c.json(result as unknown as ValidationFailureBody, 400);
}
