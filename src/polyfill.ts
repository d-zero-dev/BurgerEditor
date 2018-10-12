if (!Element.prototype.matches) {
	Element.prototype.matches =
		// @ts-ignore
		Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

if (!Element.prototype.closest) {
	Element.prototype.closest = function(s: string) {
		// tslint:disable-next-line:no-invalid-this
		let ancestor: Element | null = this;
		do {
			if (ancestor.matches(s)) {
				return ancestor;
			}
			ancestor = ancestor.parentElement;
		} while (ancestor !== null);
		return null;
	};
}
