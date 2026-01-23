---
description: Refactoring workflow with test-first approach
---

# Refactoring Workflow

When asked to refactor code, follow this strict order:

## Phase 1: Test Verification (BEFORE refactoring)

1. **Check existing tests**
   - Identify tests that cover the code to be refactored
   - Run relevant tests to confirm current behavior: `yarn test` or `npx vitest run path/to/test.spec.ts`

2. **Write missing tests if needed**
   - If there are no tests covering the refactoring scope, write them first
   - Tests should verify the expected behavior that must be preserved after refactoring
   - Run the new tests to confirm they pass with the current implementation

3. **Commit tests first**
   - Use `/git` skill to commit the test changes
   - Follow all rules defined in `.claude/commands/git.md`
   - Commit message example: `test(package): add tests for X before refactoring`

## Phase 2: Refactoring Implementation (AFTER test commit)

4. **Begin refactoring**
   - Only start refactoring after tests are committed
   - Make incremental changes
   - Run tests frequently to ensure behavior is preserved

5. **Verify refactoring**
   - Run all relevant tests: `yarn test`
   - Run build checks: `yarn build:check`
   - Run linting: `yarn lint`

6. **Commit refactoring**
   - Use `/git` skill to commit the refactoring changes
   - Commit message example: `refactor(package): simplify X implementation`

## Key Principles

- **Never refactor without tests**: Tests are your safety net
- **Test first, refactor second**: Always commit tests before refactoring
- **Preserve behavior**: Refactoring should not change external behavior
- **Small increments**: Make small, verifiable changes
