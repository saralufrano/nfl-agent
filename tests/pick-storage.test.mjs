import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizePicks } from '../lib/pick-storage.ts';

const original = { teamAbbreviation: 'CHI', lockedSpread: 3, week: 8, pickedAt: '2026-11-02T12:00:00Z', result: null };
test('existing picks remain valid without notes or reasons', () => {
  assert.deepEqual(sanitizePicks({ game: original }), { game: original });
});
test('notes and reason tags survive a storage round trip without changing the locked line', () => {
  const picks = { game: { ...original, note: 'Taking the points.', reasons: ['Defense', 'Gut feeling'] } };
  assert.deepEqual(sanitizePicks(JSON.parse(JSON.stringify(picks))), picks);
  assert.equal(sanitizePicks(picks).game.lockedSpread, 3);
});
test('rejects malformed or oversized note fields and unknown reason tags', () => {
  for (const fields of [{note:4}, {note:'x'.repeat(501)}, {reasons:'Defense'}, {reasons:[null]}, {reasons:['Other']}, {reasons:Array(5).fill('Defense')}]) {
    assert.equal(sanitizePicks({game:{...original,...fields}}), null);
  }
});
test('validates the original pick fields as well as the new optional fields', () => {
  for (const fields of [{ lockedSpread: null }, { lockedSpread: Infinity }, { week: 0 }, { teamAbbreviation: '' }, { result: 'pending' }]) {
    assert.equal(sanitizePicks({game:{...original,...fields}}), null);
  }
  assert.equal(sanitizePicks([]), null);
  assert.deepEqual(sanitizePicks({}), {});
});
