import type { UIState } from '../protocol/ws-messages.js';

/** One text block; what the agent specs seed as `a.html`. */
export const PAGE_HTML =
	'<html><body><div class="content"><div data-bge-name="text" data-bge-container="grid:1" id="bge-1">' +
	'<div data-bge-container-frame=""><div data-bge-group=""><div data-bge-item="">' +
	'<div data-bgi="wysiwyg" data-bgi-ver="1.0.0"><div data-bge="wysiwyg"><p>hello</p></div></div>' +
	'</div></div></div></div></div></body></html>';

/**
 * What a real tab acks with: the editable area's INNER content (what
 * `engine.content.getContentsAsString()` returns), never a full document.
 */
export const PAGE_INNER = PAGE_HTML.replace(
	'<html><body><div class="content">',
	'',
).replace('</div></body></html>', '');

export const IDLE_UI_STATE: UIState = {
	openDialog: null,
	sourceMode: false,
	processing: false,
	editingBlockIndex: null,
};

/**
 * @param overrides
 */
export function idleUiState(overrides: Partial<UIState> = {}): UIState {
	return { ...IDLE_UI_STATE, ...overrides };
}

/** A TEST-NET-3 address (RFC 5737): non-loopback, so `createAgentAuth` requires a token. */
export const LAN_HOST = '203.0.113.10';

/** Another TEST-NET-3 address that is NOT the configured host — rejected by `hostGuard`. */
export const FOREIGN_HOST = '203.0.113.99';

/** Correct length (48 hex chars), wrong value — exercises the constant-time compare's mismatch path. */
export const WRONG_TOKEN = '0'.repeat(48);
