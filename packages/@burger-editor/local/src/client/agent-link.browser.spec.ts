import type { Transport } from './agent-link.js';

import { BurgerEditorEngine } from '@burger-editor/core';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createAgentLink } from './agent-link.js';
import { createEngineAdapter } from './engine-adapter.js';

/**
 * One `[data-bge-container]` block with a single `wysiwyg` item, labeled by
 * `text` so assertions can tell blocks apart after a mutation.
 * @param text
 */
function blockHtml(text: string): string {
	return `<div data-bge-name="text" data-bge-container="grid:1"><div data-bge-container-frame=""><div data-bge-group=""><div data-bge-item=""><div data-bgi="wysiwyg" data-bgi-ver="1.0.0"><div data-bge="wysiwyg"><p>${text}</p></div></div></div></div></div></div>`;
}

const THREE_BLOCKS = [blockHtml('alpha'), blockHtml('bravo'), blockHtml('charlie')].join(
	'',
);

/**
 *
 */
function createOptions() {
	return {
		root: '#engine-root',
		config: {
			classList: [],
			stylesheets: [],
			sampleImagePath: '/img/sample.png',
			sampleFilePath: '/pdf/sample.pdf',
			googleMapsApiKey: null,
		},
		items: {
			wysiwyg: {
				name: 'wysiwyg',
				version: '1.0.0',
				template: '<div data-bge="wysiwyg"><p></p></div>',
				style: '',
			},
		},
		catalog: {},
		generalCSS: '',
		initialContents: THREE_BLOCKS,
	};
}

/**
 *
 */
function fakeTransport() {
	const sent: Record<string, unknown>[] = [];
	const transport: Transport = {
		send: (raw) => sent.push(JSON.parse(raw) as Record<string, unknown>),
	};
	return { transport, sent };
}

/**
 * @param op
 */
function applyFrame(op: unknown): string {
	return JSON.stringify({
		type: 'apply',
		id: 'op-1',
		area: 'main',
		op,
		baseRevision: 1,
		revision: 2,
		highlight: false,
	});
}

/**
 * Resolves once the transport has received a frame of `type`.
 * @param sent
 * @param type
 */
async function waitForFrame(
	sent: Record<string, unknown>[],
	type: string,
): Promise<Record<string, unknown>> {
	for (let i = 0; i < 200; i++) {
		const frame = sent.find((f) => f.type === type);
		if (frame) {
			return frame;
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	throw new Error(`No ${type} frame was sent`);
}

let engine: BurgerEditorEngine;

beforeEach(async () => {
	document.body.innerHTML = '<div id="engine-root"></div>';
	engine = await BurgerEditorEngine.new(createOptions());
});

afterEach(() => {
	engine[Symbol.dispose]();
});

describe('createAgentLink + createEngineAdapter against a real BurgerEditorEngine', () => {
	test('a delete apply frame removes the block from the live engine and acks with html that no longer contains it', async () => {
		const { transport, sent } = fakeTransport();
		const link = createAgentLink({
			adapter: createEngineAdapter(engine),
			transport,
			page: '/a.html',
			serverSession: 's',
		});
		expect(engine.getLiveBlocks()).toHaveLength(3);
		expect(link.consumeEcho()).toBe(false);

		link.handleMessage(applyFrame({ op: 'delete', index: 0 }));
		const ack = await waitForFrame(sent, 'ack');

		expect(ack.id).toBe('op-1');
		expect(ack.revision).toBe(2);
		expect(ack.html).not.toContain('<p>alpha</p>');
		expect(ack.html).toContain('<p>bravo</p>');
		expect(ack.html).toContain('<p>charlie</p>');
		expect(engine.getLiveBlocks()).toHaveLength(2);
		expect(engine.content.getContentsAsString()).toBe(ack.html);
		expect(link.consumeEcho()).toBe(true);
		expect(link.consumeEcho()).toBe(false);
		expect(sent.filter((f) => f.type === 'nack')).toEqual([]);

		link.dispose();
	});

	test('an update-item apply frame rewrites the targeted item text and acks with the new text', async () => {
		const { transport, sent } = fakeTransport();
		const link = createAgentLink({
			adapter: createEngineAdapter(engine),
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		link.handleMessage(
			applyFrame({
				op: 'update-item',
				index: 1,
				itemIndex: 0,
				data: { wysiwyg: '<p>bravo-updated</p>' },
			}),
		);
		const ack = await waitForFrame(sent, 'ack');

		expect(ack.html).toContain('<p>bravo-updated</p>');
		expect(ack.html).not.toContain('<p>bravo</p>');
		expect(ack.html).toContain('<p>alpha</p>');
		expect(ack.html).toContain('<p>charlie</p>');
		expect(engine.getLiveBlocks()).toHaveLength(3);
		expect(engine.getLiveBlocks()[1]!.el.querySelector('p')?.textContent).toBe(
			'bravo-updated',
		);
		expect(link.consumeEcho()).toBe(true);
		expect(link.consumeEcho()).toBe(false);

		link.dispose();
	});

	test('a delete apply frame with an out-of-range index nacks as range and leaves the engine untouched', async () => {
		const { transport, sent } = fakeTransport();
		const link = createAgentLink({
			adapter: createEngineAdapter(engine),
			transport,
			page: '/a.html',
			serverSession: 's',
		});

		link.handleMessage(applyFrame({ op: 'delete', index: 99 }));
		const nack = await waitForFrame(sent, 'nack');

		expect(nack.id).toBe('op-1');
		expect(nack.reason).toBe('range');
		expect(engine.getLiveBlocks()).toHaveLength(3);
		expect(link.consumeEcho()).toBe(false);

		link.dispose();
	});
});
