// Compatibility shim. Canonical implementation lives in @burger-editor/core.
// The Node-side jsdom-backed DOMParser is installed by @burger-editor/file-io
// (which local depends on transitively through its server entry).
import '@burger-editor/file-io';

export {
	extractContentFromHtml,
	isFullHtmlDocument,
	updateHtmlContent,
} from '@burger-editor/core';
