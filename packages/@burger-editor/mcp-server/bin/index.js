#!/usr/bin/env node

import { builtinEnvironments } from 'vitest/dist/environments.js';

import { run } from '../dist/index.js';

await builtinEnvironments.jsdom.setup(globalThis, { jsdom: {} });

await run();
