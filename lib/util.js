"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 */
function arrayToHash(kvs) {
    var result = {};
    for (var _i = 0, kvs_1 = kvs; _i < kvs_1.length; _i++) {
        var kv = kvs_1[_i];
        var k = kv[0];
        var v = kv[1];
        var toArray = kv[2];
        if (toArray) {
            var arrayPropVal = result[k];
            if (Array.isArray(arrayPropVal)) {
                arrayPropVal.push(v);
            }
            else {
                result[k] = k in result ? [arrayPropVal, v] : [v];
            }
        }
        else {
            result[k] = v;
        }
    }
    return result;
}
exports.arrayToHash = arrayToHash;
