import type { ContainerFrameSemantics } from './types.js';

/**
 *
 * @param el
 * @param frameSemantics
 */
export function changeFrameSemantics(
	el: HTMLElement,
	frameSemantics: ContainerFrameSemantics,
) {
	const containerFrame = el.querySelector('[data-bge-container-frame]');
	if (!containerFrame) {
		throw new Error('Container frame not found');
	}

	// Determine target elements
	const frameTagName = frameSemantics === 'div' ? 'div' : frameSemantics;
	const groupTagName = frameSemantics === 'div' ? 'div' : 'li';

	// Create new container frame element
	const newFrame = document.createElement(frameTagName);
	copyAttributes(containerFrame, newFrame);

	// Transform groups
	const groups = containerFrame.querySelectorAll('[data-bge-group]');
	for (const group of groups) {
		const newGroup = document.createElement(groupTagName);
		copyAttributes(group, newGroup);

		// Move all child content
		while (group.firstChild) {
			newGroup.append(group.firstChild);
		}

		newFrame.append(newGroup);
	}

	// Replace old frame with new frame
	containerFrame.parentNode?.replaceChild(newFrame, containerFrame);
}

/**
 * Copy all attributes from source to target element
 * @param source - Source element
 * @param target - Target element
 */
function copyAttributes(source: Element, target: Element) {
	for (const attr of source.attributes) {
		target.setAttribute(attr.name, attr.value);
	}

	if (source.className) {
		// Copy classes
		target.className = source.className;
	}
}
