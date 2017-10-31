"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./polyfill");
var util_1 = require("./util");
var getValue_1 = require("./getValue");
function default_1(el, attr, typeConvert) {
    var filedElements = el.querySelectorAll("[data-" + attr + "]");
    var values = [];
    for (var _i = 0, _a = Array.from(filedElements); _i < _a.length; _i++) {
        var _el = _a[_i];
        values = values.concat(getValue_1.default(_el, attr, typeConvert));
    }
    var result = util_1.arrayToHash(values);
    return result;
}
exports.default = default_1;
