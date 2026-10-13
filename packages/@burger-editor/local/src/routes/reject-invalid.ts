import type { Context } from 'hono';

/**
 * Body of the 400 response sent when a `zValidator` target fails validation.
 * Describes only the part of zod's `ZodSafeParseError` the wire format carries.
 */
export interface ValidationFailureBody {
	readonly success: false;
	readonly error: { readonly name: string; readonly issues: readonly unknown[] };
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
 * @param result
 * @param result.success
 * @param c
 * @example
 * app.post('/x', zValidator('json', schema, rejectInvalid), (c) => c.json({ ok: true }));
 */
export function rejectInvalid(result: { readonly success: boolean }, c: Context) {
	if (result.success) {
		return;
	}
	return c.json(result as unknown as ValidationFailureBody, 400);
}
