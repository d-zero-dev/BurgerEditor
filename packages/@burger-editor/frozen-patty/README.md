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
import FrozenPatty from 'frozen-patty';

FrozenPatty('<div data-field="text">value</div>').toJSON(); // => { text: 'value' }
FrozenPatty('<div data-field="field-name">value</div>').toJSON(); // => { 'field-name': 'value' }
FrozenPatty('<a href="http://localhost" data-field="href:href">link</a>').toJSON(); // => { 'href': 'http://localhost' }

FrozenPatty('<div data-bge="text">value</div>', { attr: 'bge' }).toJSON(); // => { text: 'value' }
```

### Data merge

```js
FrozenPatty('<div data-field="text">value</div>').merge({ text: 'merged' }).toHTML(); // => "<div data-field="text">merged</div>";
```

## API

### FrozenPatty (html[, options])

Extraction data from HTML.

#### arguments

| args    | type     | required | descriptions  |
| ------- | -------- | -------- | ------------- |
| html    | `string` | required | Original HTML |
| options | `Object` | optional | †             |

#### options†

| options | type   | default   | descriptions                                                                         |
| ------- | ------ | --------- | ------------------------------------------------------------------------------------ |
| attr    | string | `"field"` | **Data attribute** name for specifying the node that FrozenPatty treats as a _field_ |

### merge (data)

Data merge

| args | type     | required | descriptions |
| ---- | -------- | -------- | ------------ |
| data | `Object` | required | New data     |

### toJSON

Data to plain Object.

### toHTML

Render to HTML as string.
