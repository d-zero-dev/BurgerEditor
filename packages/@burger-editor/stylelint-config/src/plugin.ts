import selectorParser from 'postcss-selector-parser';
import type { AtRule, Node } from 'postcss';
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
 * Default patterns that indicate BurgerEditor internal selectors:
 * - `data-bge`, `data-bge-*` : Editor data-binding and structural attributes
 * - `data-bgi`, `data-bgi-*` : Item wrapper attributes
 * - `data-bgc-*` : Component-internal attributes
 * - `bge-*` : BurgerEditor custom elements
 */
const DEFAULT_ATTR_PATTERNS = [/^data-bg[eic]/];
const DEFAULT_TYPE_PATTERNS = [/^bge-/];

export interface SecondaryOptions {
	readonly disallowedAttrPatterns?: readonly (string | RegExp)[];
	readonly disallowedTypePatterns?: readonly (string | RegExp)[];
}

function toRegExp(pattern: string | RegExp): RegExp {
	if (pattern instanceof RegExp) {
		return pattern;
	}
	const match = /^\/(.+)\/([gimsuy]*)$/.exec(pattern);
	if (match) {
		return new RegExp(match[1], match[2]);
	}
	return new RegExp(pattern);
}

function matchesAny(value: string, patterns: readonly RegExp[]): boolean {
	return patterns.some((p) => p.test(value));
}

function checkSelector(
	selectorString: string,
	node: Node,
	result: stylelint.PostcssResult,
	attrPatterns: readonly RegExp[],
	typePatterns: readonly RegExp[],
) {
	selectorParser((selectors) => {
		selectors.walk((selectorNode) => {
			if (selectorNode.type === 'attribute' && matchesAny(selectorNode.attribute, attrPatterns)) {
				const attrSelector = selectorNode.toString();
				report({
					message: messages.rejected(attrSelector),
					node,
					word: attrSelector,
					result,
					ruleName,
				});
			}

			if (selectorNode.type === 'tag' && matchesAny(selectorNode.value, typePatterns)) {
				report({
					message: messages.rejected(selectorNode.value),
					node,
					word: selectorNode.value,
					result,
					ruleName,
				});
			}
		});
	}).transformSync(selectorString);
}

/**
 * Extract the root selector from `@scope` params (excludes the limit selector).
 * `@scope ([data-bge])` → `[data-bge]`
 * `@scope ([data-bge]) to (.limit)` → `[data-bge]` (limit is allowed)
 */
function extractScopeRootSelector(params: string): string | null {
	const match = /^\s*\(([^)]+)\)/.exec(params);
	return match ? match[1].trim() : null;
}

const ruleFunction: Rule<true, SecondaryOptions> = (primary, secondaryOptions) => {
	return (root, result) => {
		const validOptions = validateOptions(
			result,
			ruleName,
			{ actual: primary },
			{
				actual: secondaryOptions,
				possible: {
					disallowedAttrPatterns: [(v: unknown) => typeof v === 'string' || v instanceof RegExp],
					disallowedTypePatterns: [(v: unknown) => typeof v === 'string' || v instanceof RegExp],
				},
				optional: true,
			},
		);

		if (!validOptions) {
			return;
		}

		const attrPatterns = secondaryOptions?.disallowedAttrPatterns
			? secondaryOptions.disallowedAttrPatterns.map(toRegExp)
			: DEFAULT_ATTR_PATTERNS;

		const typePatterns = secondaryOptions?.disallowedTypePatterns
			? secondaryOptions.disallowedTypePatterns.map(toRegExp)
			: DEFAULT_TYPE_PATTERNS;

		// walkRules walks ALL Rule nodes at any nesting depth,
		// including rules inside @media, @supports, @layer, @container,
		// @scope, CSS nesting, etc.
		root.walkRules((ruleNode) => {
			const selector = ruleNode.selector;
			if (!selector) {
				return;
			}
			checkSelector(selector, ruleNode, result, attrPatterns, typePatterns);
		});

		// @scope is the only at-rule with CSS selectors in its params.
		// Only the root selector is checked; the limit (to ...) is allowed.
		root.walkAtRules('scope', (atRule: AtRule) => {
			const params = atRule.params;
			if (!params) {
				return;
			}
			const rootSelector = extractScopeRootSelector(params);
			if (rootSelector) {
				checkSelector(rootSelector, atRule, result, attrPatterns, typePatterns);
			}
		});
	};
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export default createPlugin(ruleName, ruleFunction);
