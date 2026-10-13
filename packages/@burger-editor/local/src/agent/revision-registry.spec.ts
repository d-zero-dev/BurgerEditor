import { describe, expect, test } from 'vitest';

import { RevisionRegistry } from './revision-registry.js';

describe('RevisionRegistry', () => {
	test('lazily initializes an unknown page at revision 1 with no persisted hash', () => {
		const registry = new RevisionRegistry();
		expect(registry.get('/a.html')).toBeUndefined();
		expect(registry.ensure('/a.html')).toEqual({ revision: 1, persistedHash: null });
		expect(registry.get('/a.html')).toEqual({ revision: 1, persistedHash: null });
	});

	test('bump increments the revision and records the new persisted hash', () => {
		const registry = new RevisionRegistry();
		registry.ensure('/a.html');
		const bumped = registry.bump('/a.html', 'hash-1');
		expect(bumped).toEqual({ revision: 2, persistedHash: 'hash-1' });
		expect(registry.get('/a.html')).toEqual({ revision: 2, persistedHash: 'hash-1' });
	});

	test('setPersistedHash updates the hash without touching the revision', () => {
		const registry = new RevisionRegistry();
		registry.bump('/a.html', 'hash-1');
		const updated = registry.setPersistedHash('/a.html', 'hash-2');
		expect(updated).toEqual({ revision: 2, persistedHash: 'hash-2' });
	});

	test('entries for different pages are independent', () => {
		const registry = new RevisionRegistry();
		registry.bump('/a.html', 'hash-a');
		registry.bump('/b.html', 'hash-b');
		expect(registry.get('/a.html')?.persistedHash).toBe('hash-a');
		expect(registry.get('/b.html')?.persistedHash).toBe('hash-b');
	});
});
