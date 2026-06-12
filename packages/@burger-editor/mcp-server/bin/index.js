#!/usr/bin/env node

// Pulling @burger-editor/file-io (transitively, via @burger-editor/cli used by
// v4 tools) installs lazy jsdom-backed DOM globals on first access — no
// upfront vitest/environments dependency required.
import { run } from '../dist/index.js';

await run();
