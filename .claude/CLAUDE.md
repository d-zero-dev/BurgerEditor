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

`yarn test` runs the full suite (including VR) inside a Linux/amd64 Docker
container so pixel-compared baselines render identically to CI. The first run
builds the image (slow under QEMU on Apple Silicon); subsequent runs reuse the
named volumes for `node_modules` and the Yarn cache.

```bash
# Full suite — Docker-wrapped, matches CI
yarn test

# Specific test file (host) — fine for non-VR tests during dev
npx vitest run path/to/test.spec.ts

# VR only via Docker
yarn test:vr:docker

# Regenerate VR baselines after intentional UI changes
yarn test:vr:docker:update
```

`scripts/docker-yarn.sh` skips the Docker wrapper when `/.dockerenv` or `CI`
exists, so CI runs `yarn test` directly inside its Playwright container without
nested Docker.

The image's Node version is read from `package.json`'s `volta.node` field at
build time — keep that in sync if you bump Node.

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
