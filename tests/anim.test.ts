import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { frameAt, frameKey, parseFrameKey, progressAt } from '../src/scenes/animMath';
import { toNight } from '../src/scenes/tone';

describe('pixel animations', () => {
  test('two-frame flips are opposite', () => {
    for (const p of [0, 0.25, 0.5, 0.75, 0.99]) {
      assert.equal((frameAt('pxA', p).o ?? 0) + (frameAt('pxB', p).o ?? 0), 1);
    }
  });

  test('drift steps across 6 pixels and back', () => {
    const forward = [0, 0.2, 0.4, 0.6, 0.8, 0.99].map((p) => frameAt('pxDrift', p).x);
    assert.deepEqual(forward, [0, 1, 2, 3, 4, 5]);
    const spec = { name: 'pxDrift' as const, dur: 1000, dir: 'alternate' as const };
    assert.ok(progressAt(spec, 1100) > 0.85);
  });

  test('smoke rises and fades', () => {
    const start = frameAt('pxRise', 0);
    const end = frameAt('pxRise', 0.99);
    assert.equal(start.o, 0);
    assert.ok((end.o ?? 1) < 0.05);
    assert.equal(end.y, -14);
    assert.equal(frameAt('pxRise10', 0.99).y, -10);
  });

  test('negative delays start part way through', () => {
    assert.equal(progressAt({ name: 'pxRise', dur: 4000, delay: -1000 }, 0), 0.25);
  });

  test('frame keys round trip', () => {
    const key = frameKey({ name: 'pxShoot', dur: 7000, delay: 1000 }, 1300);
    const f = parseFrameKey(key);
    assert.ok(f.x <= 0 && f.y >= 0);
    assert.equal(parseFrameKey('3|-1|').o, null);
  });

  test('night colours', () => {
    assert.equal(toNight('#FFD66B'), '#FFD66B');
    assert.equal(toNight('#8FC8E8'), '#FFD66B');
    assert.match(toNight('#6FB6E0'), /^#[0-9A-F]{6}$/);
    assert.notEqual(toNight('#6FB6E0'), '#6FB6E0');
  });
});
