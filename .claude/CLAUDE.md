# BurgerEditor v4 Project Rules

## Package Manager

**DON'T**: Use npm commands
**DO**: Use yarn for all package management

```bash
# Good
yarn install
yarn add package-name
yarn remove package-name

# Bad
npm install
npm i package-name
```

## Build Commands

**DO**: Use yarn build with scope for specific packages

```bash
# Build specific package
yarn build --scope @burger-editor/package-name

# Build all
yarn build
```

## Testing

**DO**: Use yarn test or npx vitest directly

```bash
# Run all tests
yarn test

# Run specific test file
npx vitest run path/to/test.spec.ts

# Run package tests
yarn test:unit
```

## Linting

**DO**: Use yarn lint commands

```bash
# Lint check
yarn lint

# Lint and fix
yarn lint:fix

# ESLint only
yarn lint:eslint
```

## Project Structure

- Lerna monorepo with multiple packages in `packages/`
- Check package dependencies: `npx lerna list --graph`
- Always consider inter-package dependencies when making changes
