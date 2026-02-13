import selectorParser from 'postcss-selector-parser';
import type { Rule } from 'stylelint';
import stylelint from 'stylelint';

const {
	createPlugin,
	utils: { report, ruleMessages, validateOptions },
} = stylelint;

const ruleName = '@burger-editor/no-internal-selector';

const messages = ruleMessages(ruleName, {
	rejected: (selector: string) =>
		`Unexpected BurgerEditor internal selector "${selector}". Styling BurgerEditor internal elements may cause unexpected behavior.`,
});

const meta = {
	url: 'https://github.com/d-zero-dev/BurgerEditor/tree/main/packages/@burger-editor/stylelint-config',
};

/**
 * Patterns that indicate BurgerEditor internal selectors:
 * - `data-bge`, `data-bge-*` : Editor data-binding and structural attributes
 * - `data-bgi`, `data-bgi-*` : Item wrapper attributes
 * - `data-bgc-*` : Component-internal attributes
 * - `bge-*` : BurgerEditor custom elements
 */
const INTERNAL_ATTR_PATTERN = /^data-bg[eic]/;
const INTERNAL_TYPE_PATTERN = /^bge-/;

const ruleFunction: Rule = (primary) => {
	return (root, result) => {
		const validOptions = validateOptions(result, ruleName, {
			actual: primary,
		});

		if (!validOptions) {
			return;
		}

		root.walkRules((ruleNode) => {
			const selector = ruleNode.selector;

			if (!selector) {
				return;
			}

			selectorParser((selectors) => {
				selectors.walk((node) => {
					if (node.type === 'attribute' && INTERNAL_ATTR_PATTERN.test(node.attribute)) {
						const attrSelector = node.toString();
						report({
							message: messages.rejected(attrSelector),
							node: ruleNode,
							word: attrSelector,
							result,
							ruleName,
						});
					}

					if (node.type === 'tag' && INTERNAL_TYPE_PATTERN.test(node.value)) {
						report({
							message: messages.rejected(node.value),
							node: ruleNode,
							word: node.value,
							result,
							ruleName,
						});
					}
				});
			}).transformSync(selector);
		});
	};
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export default createPlugin(ruleName, ruleFunction);
