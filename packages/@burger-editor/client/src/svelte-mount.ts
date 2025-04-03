/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Component, MountOptions } from 'svelte';

import { mount, unmount } from 'svelte';

/**
 *
 * @param component
 * @param options
 */
export function svelteMount<P extends Record<string, any>>(
	component: Component<P>,
	options: MountOptions<P>,
) {
	const svelteComponent = mount(component, options);

	return {
		cleanUp: () => {
			void unmount(svelteComponent, { outro: false });
		},
	};
}
