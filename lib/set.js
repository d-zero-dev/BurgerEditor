"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./polyfill");
var setValue_1 = __importDefault(require("./setValue"));
function default_1(el, data, attr, filter) {
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
                var listRoot = targetEl.closest("[data-" + attr + "-list]");
                if (!listRoot || (listRoot && !listRoot.children.length)) {
                    return "continue";
                }
                var listItem = listRoot.children[0].cloneNode(true);
                while (datum_1.length > listRoot.children.length) {
                    listRoot.appendChild(listItem.cloneNode(true));
                }
                var newChildren = listRoot.querySelectorAll(selector);
                var oldChildList_1 = Array.from(listRoot.children);
                var deleteNodeList_1 = [];
                Array.from(newChildren).forEach(function (child, i) {
                    if (datum_1[i] != null) {
                        setValue_1.default(dataKeyName, datum_1[i], child, attr, filter);
                        deleteNodeList_1 = [];
                    }
                    else {
                        setValue_1.default(dataKeyName, '', child, attr, filter);
                        deleteNodeList_1.push(oldChildList_1[i]);
                    }
                });
                deleteNodeList_1.forEach(function (node) { return node.remove(); });
            }
            else {
                Array.from(targetList).forEach(function (targetEl, i) {
                    setValue_1.default(dataKeyName, datum_1, targetEl, attr, filter);
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
