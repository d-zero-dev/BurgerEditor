"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 */
function arrayToHash(kvs) {
    var result = {};
    kvs.forEach(function (kv) {
        var k = kv[0];
        var v = kv[1];
        var toArray = kv[2];
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
exports.arrayToHash = arrayToHash;
