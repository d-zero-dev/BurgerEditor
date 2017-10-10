"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var imports_1 = require("./imports");
var toJSON_1 = require("./toJSON");
var FrozenPatty = /** @class */ (function () {
    /**
     *
     * @param html Original HTML
     * @param options Options
     */
    function FrozenPatty(html, options) {
        this._attr = 'field';
        this._dom = document.createElement('fp-placeholer');
        this._dom.innerHTML = html;
        if (options && options.attr) {
            this._attr = options.attr;
        }
    }
    FrozenPatty.prototype.merge = function (data) {
        var currentData = this.toJSON();
        var newData = Object.assign(currentData, data);
        this._dom = imports_1.imports(this._dom, newData, this._attr);
        return this;
    };
    FrozenPatty.prototype.toJSON = function () {
        return toJSON_1.toJSON(this._dom, this._attr);
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
