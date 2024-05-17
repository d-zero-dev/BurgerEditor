# frozen-patty

[![npm version](https://badge.fury.io/js/@burger-editor%2Ffrozen-patty.svg)](https://badge.fury.io/js/@burger-editor%2Ffrozen-patty)

Pure HTML to JSON converter that not use template engine.

## Install

```
$ npm install -D @burger-editor/frozen-patty
```

## Usage

### Extraction

```js
import frozenPatty from '@burger-editor/frozen-patty';

frozenPatty('<div data-field="text">value</div>').toJSON(); // => { text: 'value' }
frozenPatty('<div data-field="field-name">value</div>').toJSON(); // => { 'field-name': 'value' }
frozenPatty('<a href="http://localhost" data-field="href:href">link</a>').toJSON(); // => { 'href': 'http://localhost' }

frozenPatty('<div data-bge="text">value</div>', { attr: 'bge' }).toJSON(); // => { text: 'value' }
```

### Data merge

```js
frozenPatty('<div data-field="text">value</div>').merge({ text: 'merged' }).toHTML(); // => "<div data-field="text">merged</div>";
```

## API

### `frozenPatty(html[, options])`

Extraction data from HTML.

#### Parameters

| parameter | type     | required | descriptions  |
| --------- | -------- | -------- | ------------- |
| html      | `string` | required | Original HTML |
| options   | `Object` | optional | †             |

#### Options†

| options | type   | default   | descriptions                                                                         |
| ------- | ------ | --------- | ------------------------------------------------------------------------------------ |
| attr    | string | `"field"` | **Data attribute** name for specifying the node that FrozenPatty treats as a _field_ |

### `merge(data)`

Merge data.

| args | type     | required | descriptions |
| ---- | -------- | -------- | ------------ |
| data | `Object` | required | New data     |

### `toJSON`

Convert to JSON.

### `toHTML`

Convert to HTML string.
