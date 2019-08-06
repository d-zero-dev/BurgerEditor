"use strict";
if (!Element.prototype.matches) {
    Element.prototype.matches =
        // @ts-ignore
        Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}
if (!Element.prototype.closest) {
    Element.prototype.closest = function (s) {
        // tslint:disable-next-line:no-invalid-this
        var ancestor = this;
        do {
            if (ancestor.matches(s)) {
                return ancestor;
            }
            ancestor = ancestor.parentElement;
        } while (ancestor !== null);
        return null;
    };
}
//# sourceMappingURL=polyfill.js.map