import { BoxGeometry, SphereGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { mergeParts } from './merge';

describe('merge', () => {
  it('joins parts with the same attributes into one geometry', () => {
    const box = new BoxGeometry(1, 1, 1);
    const ball = new SphereGeometry(1, 8, 6);
    const expected = box.getAttribute('position').count + ball.getAttribute('position').count;
    expect(mergeParts([box, ball]).getAttribute('position').count).toBe(expected);
  });

  it('refuses parts that do not match', () => {
    const box = new BoxGeometry(1, 1, 1);
    const bare = new BoxGeometry(1, 1, 1);
    bare.deleteAttribute('uv');
    expect(() => mergeParts([box, bare])).toThrow();
  });
});
