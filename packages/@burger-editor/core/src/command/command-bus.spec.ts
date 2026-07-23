import { test, expect, describe, beforeEach, vi } from 'vitest';

import { CommandBus, COMMAND_BUS_ID } from './command-bus.js';

/**
 * CommandEventはTS DOM libに未定義のため、テストでは同名プロパティを
 * 持つ合成イベントで代用する
 * @param el
 * @param command
 * @param source
 */
function dispatchCommand(el: HTMLElement, command: string, source?: Element) {
	const event = new Event('command');
	Object.assign(event, { command, source: source ?? null });
	el.dispatchEvent(event);
}

describe('CommandBus', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('createReceiver installs a hidden element with the shared id', () => {
		const bus = new CommandBus();
		const receiver = bus.createReceiver(document.body);

		expect(receiver.id).toBe(COMMAND_BUS_ID);
		expect(receiver.hidden).toBe(true);
		expect(receiver.parentElement).toBe(document.body);
	});

	test('dispatches command events to the registered handler', () => {
		const bus = new CommandBus();
		const receiver = bus.createReceiver(document.body);
		const handler = vi.fn();
		bus.define('--test-command', handler);

		const button = document.createElement('button');
		dispatchCommand(receiver, '--test-command', button);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0]?.[0]?.source).toBe(button);
	});

	test('ignores commands without a handler', () => {
		const bus = new CommandBus();
		const receiver = bus.createReceiver(document.body);
		const handler = vi.fn();
		bus.define('--known', handler);

		dispatchCommand(receiver, '--unknown');

		expect(handler).not.toHaveBeenCalled();
	});

	test('one dispatch table serves multiple receivers', () => {
		const bus = new CommandBus();
		const receiverA = bus.createReceiver(document.body);
		const container = document.createElement('div');
		document.body.append(container);
		const receiverB = bus.createReceiver(container);

		const handler = vi.fn();
		bus.define('--multi', handler);

		dispatchCommand(receiverA, '--multi');
		dispatchCommand(receiverB, '--multi');

		expect(handler).toHaveBeenCalledTimes(2);
	});

	test('throws on duplicate command definition', () => {
		const bus = new CommandBus();
		bus.define('--dup', () => {});

		expect(() => bus.define('--dup', () => {})).toThrow('Command already defined');
	});

	test('destroy detaches listeners and removes created receivers', () => {
		const bus = new CommandBus();
		const receiver = bus.createReceiver(document.body);
		const handler = vi.fn();
		bus.define('--after-destroy', handler);

		bus.destroy();

		expect(receiver.isConnected).toBe(false);
		dispatchCommand(receiver, '--after-destroy');
		expect(handler).not.toHaveBeenCalled();
	});
});
