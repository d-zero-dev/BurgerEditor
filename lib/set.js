"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./polyfill");
var setValue_1 = require("./setValue");
function default_1(el, data, attr, typeConvert, filter) {
    if (typeConvert === void 0) { typeConvert = false; }
    el = el.cloneNode(true);
    var _loop_1 = function (dataKeyName) {
        if (data.hasOwnProperty(dataKeyName)) {
            var datum_1 = data[dataKeyName];
            var selector = "[data-" + attr + "*=\"" + dataKeyName + "\"]";
            var targetList = el.querySelectorAll(selector);
            if (Array.isArray(datum_1)) {
                var targetEl = targetList[0];
                if (!targetEl) {
                    return "continue";
                }
                var listRoot_1 = targetEl.closest("[data-" + attr + "-list]");
                if (!listRoot_1 || listRoot_1 && !listRoot_1.children.length) {
                    return "continue";
                }
                var listItem = listRoot_1.children[0].cloneNode(true);
                while (datum_1.length > listRoot_1.children.length) {
                    listRoot_1.appendChild(listItem.cloneNode(true));
                }
                var newChildren = listRoot_1.querySelectorAll(selector);
                Array.from(newChildren).forEach(function (child, i) {
                    if (datum_1[i] != null) {
                        setValue_1.default(dataKeyName, datum_1[i], child, attr);
                    }
                    else {
                        listRoot_1.children[i].remove();
                    }
                });
            }
            else {
                Array.from(targetList).forEach(function (targetEl, i) {
                    setValue_1.default(dataKeyName, datum_1, targetEl, attr);
                });
            }
        }
    };
    for (var dataKeyName in data) {
        _loop_1(dataKeyName);
    }
    return el;
}
exports.default = default_1;
