import plugin from './plugin.js';

const config = {
	plugins: [plugin],
	rules: {
		'@burger-editor/no-internal-selector': true,
	},
};

export default config;
