/**
 *
 * @param elA
 * @param elB
 * @param duration
 */
export async function replaceElement(elA: HTMLElement, elB: HTMLElement, duration = 600) {
	if (elA.parentElement !== elB.parentElement) {
		throw new Error('The parent element of the two elements is different.');
	}

	const lockCSS = {
		visibility: 'hidden',
		pointerEvents: 'none',
	} as const satisfies Partial<CSSStyleDeclaration>;

	const boxA = elA.getBoundingClientRect();
	const boxB = elB.getBoundingClientRect();

	const tmpContainer = elA.ownerDocument.createElement('div');
	tmpContainer.style.position = 'absolute';
	tmpContainer.style.top = `0px`;
	tmpContainer.style.left = `0px`;
	tmpContainer.style.zIndex = '2147483647';

	const tmpA = elA.cloneNode(true) as HTMLElement;
	tmpA.style.position = 'absolute';
	tmpA.style.top = `${boxA.top}px`;
	tmpA.style.left = `${boxA.left}px`;
	tmpA.style.width = `${boxA.width}px`;
	tmpA.style.height = `${boxA.height}px`;
	tmpA.style.zIndex = '20';

	const tmpB = elB.cloneNode(true) as HTMLElement;
	tmpB.style.position = 'absolute';
	tmpB.style.top = `${boxB.top}px`;
	tmpB.style.left = `${boxB.left}px`;
	tmpB.style.width = `${boxB.width}px`;
	tmpB.style.height = `${boxB.height}px`;
	tmpB.style.zIndex = '10';

	tmpContainer.append(tmpA, tmpB);
	tmpContainer.ownerDocument.body.append(tmpContainer);

	elB.remove();
	elA.before(elB);

	elA.style.visibility = lockCSS.visibility;
	elA.style.pointerEvents = lockCSS.pointerEvents;
	elB.style.visibility = lockCSS.visibility;
	elB.style.pointerEvents = lockCSS.pointerEvents;

	const animateA = tmpA.animate(
		[
			{ top: tmpA.style.top, left: tmpA.style.left },
			{ top: `${boxA.top + boxB.height}px`, left: tmpB.style.left },
		],
		{
			duration,
		},
	);
	const animateB = tmpB.animate(
		[
			{ top: tmpB.style.top, left: tmpB.style.left },
			{ top: tmpA.style.top, left: tmpA.style.left },
		],
		{
			duration,
		},
	);

	await Promise.all([animateA.finished, animateB.finished]);

	tmpContainer.remove();
	elA.removeAttribute('style');
	elB.removeAttribute('style');
}
