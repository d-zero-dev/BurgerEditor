"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./polyfill");
function toJSON(el, attr) {
    var filedElements = el.querySelectorAll("[data-" + attr + "]");
    var values = [];
    for (var _i = 0, _a = Array.from(filedElements); _i < _a.length; _i++) {
        var _el = _a[_i];
        values = values.concat(extractor(_el, attr));
    }
    // console.log(values);
    var result = arrayToHash(values);
    return result;
}
exports.toJSON = toJSON;
/**
 *
 * @param el HTMLElement
 * @param attr Data attribute name for specifying the node that FrozenPatty treats as a field.
 */
function extractor(el, attr) {
    /**
     * [key, value, forceArray]
     */
    var result = [];
    var rawValue = el.getAttribute("data-" + attr);
    var listRoot = el.closest("[data-" + attr + "-list]");
    var forceArray = !!listRoot;
    if (rawValue == null) {
        throw new Error("data-" + attr + " attriblute is empty.");
    }
    var fieldList = ("" + rawValue).split(/\s*,\s*/);
    // console.log({fieldList, el: el.innerHTML});
    for (var _i = 0, fieldList_1 = fieldList; _i < fieldList_1.length; _i++) {
        var fieldName = fieldList_1[_i];
        var splitKey = void 0;
        var keyAttr = '';
        var value = void 0;
        fieldName = fieldName.trim();
        if (/^[a-z_-](?:[a-z0-9_-])*:[a-z_-](?:[a-z0-9_-])*(?:\([a-z-]+\))?/i.test(fieldName)) {
            splitKey = fieldName.split(':');
            fieldName = splitKey[0].trim();
            keyAttr = splitKey[1].trim();
        }
        // console.log({fieldName, keyAttr, el: el.innerHTML});
        if (keyAttr === 'text') {
            value = el.innerHTML;
        }
        else if (/^style\([a-z-]+\)$/i.test(keyAttr)) {
            var css = keyAttr.replace(/^style\(([a-z-]+)\)$/i, '$1');
            var style = window.getComputedStyle(el);
            value = style.getPropertyValue(css);
            if (css === 'background-image') {
                value = getBackgroundImagePath(value);
            }
        }
        else if (keyAttr) {
            switch (keyAttr) {
                case 'checked': {
                    value = el.checked;
                    break;
                }
                case 'disabled': {
                    value = el.disabled;
                    break;
                }
                case 'download': {
                    value = el.download;
                    break;
                }
                case 'contenteditable': {
                    value = el.contentEditable;
                    break;
                }
                default: {
                    value = el.getAttribute(keyAttr) || '';
                }
            }
        }
        else {
            if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
                var val = el.value;
                if (Array.isArray(val)) {
                    value = val[0];
                }
                else {
                    value = val || '';
                }
            }
            else {
                value = el.innerHTML;
            }
        }
        // console.log({fieldName, value});
        value = value != null ? value : '';
        result.push([fieldName, value, forceArray]);
    }
    // console.log({result});
    return result;
}
exports.extractor = extractor;
/**
 * Get path from value of "background-image"
 *
 */
function getBackgroundImagePath(value) {
    var origin = location.protocol + "//" + location.hostname + (location.port ? ":" + location.port : '');
    return decodeURI(value.replace(/^url\(["']?([^"']+)["']?\)$/i, '$1').replace(origin, ''));
}
/**
 *
 */
function arrayToHash(kvs) {
    var result = {};
    kvs.forEach(function (kv) {
        var k = kv[0];
        var v = kv[1];
        var toArray = kv[2]; // tslint:disable-line:no-magic-numbers
        if (toArray) {
            var alv = result[k];
            if (Array.isArray(alv)) {
                alv.push(v);
            }
            else {
                result[k] = k in result ? [alv, v] : [v];
            }
        }
        else {
            result[k] = v;
        }
    });
    return result;
}
