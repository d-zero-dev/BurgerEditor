import type { AgentAuth } from './auth.js';
import type { AgentDeps, AgentEnv } from './env.js';

import { Hono } from 'hono';
import { describe, expect, test } from 'vitest';

import { agentEnabled, requireAgentAuth } from './env.js';

/**
 * @param required
 * @param verifyResult
 */
function fakeAuth(required: boolean, verifyResult = false): AgentAuth {
	return {
		required,
		token: null,
		tokenFilePath: null,
		verify: () => verifyResult,
		async [Symbol.asyncDispose]() {},
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeHub = {} as any;

describe('agentEnabled', () => {
	test('answers 404 without calling through when deps is null (agent.enabled: false)', async () => {
		const app = new Hono<AgentEnv>()
			.use(agentEnabled(null))
			.get('/x', (c) => c.text('ok'));
		const res = await app.request('/x');
		expect(res.status).toBe(404);
	});

	test('exposes deps as c.get("agent") and calls through when deps is provided', async () => {
		const deps: AgentDeps = { hub: fakeHub, auth: fakeAuth(false) };
		const app = new Hono<AgentEnv>()
			.use(agentEnabled(deps))
			.get('/x', (c) => c.json({ sameDeps: c.get('agent') === deps }));
		const res = await app.request('/x');
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ sameDeps: true });
	});
});

describe('requireAgentAuth', () => {
	test('401 Unauthorized when isAgentAuthed rejects the request', async () => {
		const deps: AgentDeps = { hub: fakeHub, auth: fakeAuth(true, false) };
		const app = new Hono<AgentEnv>()
			.use(agentEnabled(deps))
			.use(requireAgentAuth())
			.get('/x', (c) => c.text('ok'));
		const res = await app.request('/x');
		expect(res.status).toBe(401);
		expect(await res.text()).toBe('Unauthorized');
	});

	test('calls through to the handler when isAgentAuthed accepts the request', async () => {
		// required: false short-circuits isAgentAuthed to true regardless of credentials.
		const deps: AgentDeps = { hub: fakeHub, auth: fakeAuth(false) };
		const app = new Hono<AgentEnv>()
			.use(agentEnabled(deps))
			.use(requireAgentAuth())
			.get('/x', (c) => c.text('ok'));
		const res = await app.request('/x');
		expect(res.status).toBe(200);
		expect(await res.text()).toBe('ok');
	});
});
