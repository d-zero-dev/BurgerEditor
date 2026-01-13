# @burger-editor/inspector

HTML inspection and search utilities for BurgerEditor.

## Overview

`@burger-editor/inspector` provides tools to inspect and search through BurgerEditor HTML files. It includes utilities for searching CSS variables, analyzing block structures, and more.

## Features

- **CSS Variable Search**: Search for CSS variables in HTML files using flexible query syntax
- **jsdom Integration**: Parse HTML files using jsdom for accurate DOM manipulation
- **Proxy Utilities**: Bridge jsdom's API differences with browser standards

## Installation

```bash
yarn add @burger-editor/inspector
```

## Usage

### CSS Variable Search

```typescript
import { scanHtmlFiles, parseSearchQuery } from '@burger-editor/inspector';

// Parse a search query
const searchParams = parseSearchQuery('margin=normal');

// Scan HTML files
const matches = await scanHtmlFiles('/path/to/documentRoot', searchParams);

for (const match of matches) {
	console.log(`${match.filePath}:${match.lineNumber}`);
}
```

### Multiple Query (AND Search)

```typescript
import { scanHtmlFilesWithMultipleQueries } from '@burger-editor/inspector';

// All queries must match on the same element
const matches = await scanHtmlFilesWithMultipleQueries('/path/to/documentRoot', [
	{ category: 'margin', values: ['normal'], isWildcard: false },
	{ category: 'bg-color', values: ['blue'], isWildcard: false },
]);
```

### Query Formats

- **Simple**: `margin=normal` - Exact value match
- **Wildcard**: `margin=*` - Match any value
- **OR values**: `margin=normal,large` - Match any of the values

### jsdom Proxy Utilities

```typescript
import { proxyJsdomElementForIterableStyle } from '@burger-editor/inspector';
import { exportStyleOptions } from '@burger-editor/core';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(html);
const element = dom.window.document.querySelector('[data-bge-container]');

// Make jsdom element compatible with browser API
const proxiedElement = proxyJsdomElementForIterableStyle(element);

// Now you can use core's exportStyleOptions
const styleOptions = exportStyleOptions(proxiedElement);
```

## API

### `scanHtmlFiles(documentRoot, searchParams)`

Scan HTML files for CSS variable matches.

**Parameters:**

- `documentRoot` (string): Root directory to search in
- `searchParams` (SearchParams): Search parameters

**Returns:** `Promise<SearchMatch[]>`

### `scanHtmlFilesWithMultipleQueries(documentRoot, searchParamsArray)`

Scan HTML files with multiple queries (AND search).

**Parameters:**

- `documentRoot` (string): Root directory to search in
- `searchParamsArray` (readonly SearchParams[]): Array of search parameters

**Returns:** `Promise<SearchMatch[]>`

### `parseSearchQuery(query)`

Parse search query string into structured parameters.

**Parameters:**

- `query` (string): Search query string (e.g., "margin=normal")

**Returns:** `SearchParams`

**Throws:** Error if query format is invalid

### `matchesSearchQuery(styleOptions, searchParams)`

Check if style options match the search query.

**Parameters:**

- `styleOptions` (Record<string, string>): Style options extracted from element
- `searchParams` (SearchParams): Search parameters

**Returns:** `boolean`

### `proxyJsdomElementForIterableStyle(el)`

Create Proxy of jsdom HTMLElement to make `el.style` iterable.

**Parameters:**

- `el` (HTMLElement): HTMLElement from jsdom

**Returns:** `HTMLElement` (Proxied)

## Types

```typescript
interface SearchParams {
	readonly category: string;
	readonly values: readonly string[];
	readonly originalQuery: string;
	readonly isWildcard: boolean;
}

interface SearchMatch {
	readonly filePath: string;
	readonly lineNumber: number;
	readonly lineContent: string;
}
```

## Future Features

- Block structure search
- Item search
- Content search
- Dependency analysis
- HTML structure analysis

## License

Dual Licensed under MIT OR Apache-2.0
