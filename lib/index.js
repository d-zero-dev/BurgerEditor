"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var frozen_patty_1 = require("./frozen-patty");
/**
 * Pure HTML to JSON converter that not use template engine.
 *
 * @param html Original HTML
 * @param options Options
 */
function default_1(html, options) {
    return new frozen_patty_1.default(html, options);
}
exports.default = default_1;
