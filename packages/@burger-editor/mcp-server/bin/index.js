#!/usr/bin/env node

import { builtinEnvironments } from 'vitest/environments';

import { run } from '../dist/index.js';

await builtinEnvironments.jsdom.setup(globalThis, { jsdom: {} });

await run();
