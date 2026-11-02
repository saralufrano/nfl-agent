import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gradePick, summarizePicks, hitRate, formatRecord } from '../lib/pick-analytics.ts';

const game = (id, awayScore = 20, homeScore = 23, completed = true) => ({
  id, completed, teams: [
    { abbreviation: 'AWY', score: awayScore, spread: 10 },
    { abbreviation: 'HME', score: homeScore, spread: -10 },
  ],
});
const pick = (teamAbbreviation, lockedSpread) => ({ teamAbbreviation, lockedSpread, week: 1, pickedAt: '2026-10-01' });
const week = (games, number = 1) => ({ number, games, status: 'Completed' });

test('grades against the locked spread, even when the current line or stored result differs', () => {
  assert.equal(gradePick(game('1'), { ...pick('AWY', 4), result: 'loss' }), 'win');
  assert.equal(gradePick(game('1'), pick('AWY', 2)), 'loss');
  assert.equal(gradePick(game('1'), pick('AWY', 3)), 'push');
  assert.equal(gradePick(game('1'), pick('HME', -2)), 'win');
  assert.equal(gradePick(game('1'), pick('HME', -4)), 'loss');
});

test('does not grade pending games, absent picks, invalid teams, lines or scores', () => {
  assert.equal(gradePick(game('1', 20, 23, false), pick('AWY', 3)), null);
  assert.equal(gradePick(game('1'), undefined), null);
  assert.equal(gradePick(game('1'), pick('OLD', 3)), null);
  for (const spread of [null, undefined, NaN, Infinity, '3']) {
    assert.equal(gradePick(game('1'), pick('AWY', spread)), null);
  }
  for (const score of [null, undefined, NaN, Infinity]) {
    assert.equal(gradePick({ ...game('1'), teams: [{ abbreviation: 'AWY', score }, game('1').teams[1]] }, pick('AWY', 3)), null);
  }
});

test('aggregates all weeks once, splits by locked line and venue, and excludes unmatched picks', () => {
  const games = [game('1'), game('2'), game('3'), game('4'), game('5', 20, 23, false)];
  const picks = {
    1: pick('AWY', 4), 2: pick('HME', -4), 3: pick('AWY', 3),
    4: pick('HME', 0), 5: pick('AWY', 4), old: pick('AWY', 4),
  };
  const result = summarizePicks([week(games.slice(0, 2)), week(games.slice(2), 2), week([games[0]], 3)], picks);
  assert.deepEqual(result, {
    season: { wins: 2, losses: 1, pushes: 1 },
    favorites: { wins: 0, losses: 1, pushes: 0 },
    underdogs: { wins: 1, losses: 0, pushes: 1 },
    away: { wins: 1, losses: 0, pushes: 1 },
    home: { wins: 1, losses: 1, pushes: 0 },
  });
  assert.equal(hitRate(result.season), '66.7%');
  assert.equal(formatRecord(result.season), '2–1–1');
});

test('empty and push-only records have no hit rate', () => {
  const empty = summarizePicks([], {}).season;
  assert.equal(formatRecord(empty), '0–0–0');
  assert.equal(hitRate(empty), '—');
  assert.equal(hitRate({ wins: 0, losses: 0, pushes: 2 }), '—');
  assert.equal(hitRate({ wins: 0, losses: 2, pushes: 0 }), '0.0%');
});
