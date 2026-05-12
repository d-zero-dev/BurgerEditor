#!/usr/bin/env bash
# Wraps a yarn command in the bge-vr Docker container so VR tests render
# pixel-identically to CI. Skips Docker when already inside a container.
#
# Usage: scripts/docker-yarn.sh test:unit
#        scripts/docker-yarn.sh test:vr --update
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ -f /.dockerenv ] || [ -n "${CI:-}" ] || [ -n "${SKIP_DOCKER:-}" ]; then
	exec yarn "$@"
fi

NODE_VERSION=$(node -p "require('./package.json').volta.node")
IMAGE_TAG="bge-vr:node-${NODE_VERSION}"

if ! docker image inspect "$IMAGE_TAG" >/dev/null 2>&1; then
	echo "Building $IMAGE_TAG (NODE_VERSION=${NODE_VERSION})..." >&2
	docker build \
		--platform=linux/amd64 \
		--build-arg "NODE_VERSION=${NODE_VERSION}" \
		-f Dockerfile.vr \
		-t "$IMAGE_TAG" \
		.
fi

quoted_args=$(printf '%q ' "$@")

docker run --rm \
	-v "$REPO_ROOT":/work \
	-v bge-vr-node-modules:/work/node_modules \
	-v bge-vr-yarn-cache:/root/.yarn/berry/cache \
	-w /work \
	"$IMAGE_TAG" \
	bash -lc "yarn install --immutable && yarn $quoted_args"
