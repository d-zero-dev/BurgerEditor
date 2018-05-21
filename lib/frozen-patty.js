"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var get_1 = require("./get");
var set_1 = require("./set");
var FrozenPatty = /** @class */ (function () {
    /**
     *
     * @param html Original HTML
     * @param options Options
     */
    function FrozenPatty(html, options) {
        this._attr = 'field';
        this._typeConvert = false;
        this._dom = document.createElement('fp-placeholer');
        this._dom.innerHTML = html;
        if (options) {
            if (options.attr) {
                this._attr = options.attr;
            }
            this._typeConvert = !!options.typeConvert;
            this._filter = options.valueFilter;
        }
    }
    FrozenPatty.prototype.merge = function (data) {
        var currentData = this.toJSON(false);
        var newData = Object.assign(currentData, data);
        this._dom = set_1.default(this._dom, newData, this._attr, this._typeConvert, this._filter);
        return this;
    };
    FrozenPatty.prototype.toJSON = function (filtering) {
        if (filtering === void 0) { filtering = true; }
        var filter = filtering ? this._filter : undefined;
        return get_1.default(this._dom, this._attr, this._typeConvert, filter);
    };
    FrozenPatty.prototype.toHTML = function () {
        return this._dom.innerHTML;
    };
    FrozenPatty.prototype.toDOM = function () {
        return this._dom;
    };
    return FrozenPatty;
}());
exports.default = FrozenPatty;
