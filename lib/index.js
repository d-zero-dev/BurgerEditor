"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var frozen_patty_1 = __importDefault(require("./frozen-patty"));
var getValue_1 = __importDefault(require("./getValue"));
var setValue_1 = __importDefault(require("./setValue"));
var util_1 = require("./util");
/**
 * Pure HTML to JSON converter that not use template engine.
 *
 * @param html Original HTML
 * @param options Options
 */
function frozenPatty(html, options) {
    return new frozen_patty_1.default(html, options);
}
(function (frozenPatty) {
    /**
     * Set value to an element
     *
     * ```html
     * <div [target-attribute] data-[attr]="[name]:[target-attribute]"></div>
     * ```
     *
     * @param el A target element
     * @param name A label name
     * @param datum A datum of value
     * @param attr Data attribute name for specifying the node that FrozenPatty treats as a field
     */
    function setValue(el, name, datum, attr, filter) {
        if (attr === void 0) { attr = 'field'; }
        return setValue_1.default(name, datum, el, attr, filter);
    }
    frozenPatty.setValue = setValue;
    /**
     * Get value from an element
     *
     * @param el A target element
     * @param name A label name
     * @param typeConvert Auto covert type of value
     * @param attr Data attribute name for specifying the node that FrozenPatty treats as a field
     */
    function getValue(el, name, typeConvert, attr, filter) {
        if (typeConvert === void 0) { typeConvert = false; }
        if (attr === void 0) { attr = 'field'; }
        var data = util_1.arrayToHash(getValue_1.default(el, attr, typeConvert, filter));
        return data[name];
    }
    frozenPatty.getValue = getValue;
})(frozenPatty || (frozenPatty = {}));
exports.default = frozenPatty;
//# sourceMappingURL=index.js.map