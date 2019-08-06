"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Get value from an element
 *
 * @param el HTMLElement
 * @param attr Data attribute name for specifying the node that FrozenPatty treats as a field
 * @param typeConvert Auto covert type of value
 */
function default_1(el, attr, typeConvert, filter) {
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
            var style = void 0;
            if (el instanceof HTMLElement) {
                style = el.style;
            }
            else {
                style = window.getComputedStyle(el);
            }
            value = style.getPropertyValue(css);
            if (css === 'background-image') {
                value = getBackgroundImagePath(value);
            }
        }
        else if (keyAttr) {
            value = getAttribute(el, keyAttr, typeConvert);
        }
        else {
            if (el instanceof HTMLInputElement ||
                el instanceof HTMLSelectElement ||
                el instanceof HTMLTextAreaElement) {
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
        if (filter) {
            value = filter(value);
        }
        result.push([fieldName, value, forceArray]);
    }
    // console.log({result});
    return result;
}
exports.default = default_1;
function getAttribute(el, keyAttr, typeConvert) {
    switch (keyAttr) {
        case 'contenteditable': {
            if (el instanceof HTMLElement) {
                return el.contentEditable === '' || el.contentEditable === 'true';
            }
            else {
                return (el.getAttribute(keyAttr) === '' || el.getAttribute(keyAttr) === 'true');
            }
        }
        case 'checked': {
            return el.checked;
        }
        case 'disabled': {
            return el.disabled;
        }
        case 'download': {
            // An inactive download attribute always returns an empty string.
            // So to get inactive it is necessary to use the "hasAttribute" method.
            return el.hasAttribute('download') ? el.getAttribute('download') : null;
        }
        case 'href': {
            // return (el as HTMLAnchorElement).href;
            return el.getAttribute(keyAttr) || ''; // return plain string
        }
        default: {
            if (/^data-/.test(keyAttr)) {
                var value = el.getAttribute(keyAttr) || '';
                if (typeConvert) {
                    switch (value) {
                        case 'true':
                            return true;
                        case 'false':
                            return false;
                    }
                    var numeric = parseFloat(value);
                    if (isFinite(numeric)) {
                        return numeric;
                    }
                    else {
                        return value;
                    }
                }
                else {
                    return value;
                }
            }
            else {
                return el.getAttribute(keyAttr) || '';
            }
        }
    }
}
/**
 * Get path from value of "background-image"
 *
 */
function getBackgroundImagePath(value) {
    var origin = location.protocol + "//" + location.hostname + (location.port ? ":" + location.port : '');
    return decodeURI(value.replace(/^url\(["']?([^"']+)["']?\)$/i, '$1').replace(origin, ''));
}
//# sourceMappingURL=getValue.js.map