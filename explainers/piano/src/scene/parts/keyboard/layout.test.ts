import { describe, expect, it } from 'vitest';
import {
  KEY,
  KEYS,
  KEY_DIP_MM,
  KEY_LEVER,
  PLAYED_KEY,
  WHITE_KEY_COUNT,
  isBlackKey,
  keyX,
  mm,
} from '../../../model';
import {
  ALL_KEYS,
  KEY_PLAN,
  NOTCHES,
  blackKeys,
  keyboardLabelKey,
  punchings,
  stickBounds,
  whiteKeysWith,
  whiteNotch,
  whiteOutline,
} from './layout';

const DIGITS = 6;
const C1 = 4;
const D1 = 6;
const E1 = 8;

describe('keyboard layout', () => {
  it('notches each white key where a black key sits beside it', () => {
    expect(whiteNotch(1)).toBe('right');
    expect(whiteNotch(C1)).toBe('right');
    expect(whiteNotch(D1)).toBe('both');
    expect(whiteNotch(E1)).toBe('left');
    expect(whiteNotch(KEYS)).toBe('none');
  });

  it('places every key once across the white shapes and the black keys', () => {
    const whites = NOTCHES.flatMap(whiteKeysWith);
    expect(whites).toHaveLength(WHITE_KEY_COUNT);
    expect(new Set([...whites, ...blackKeys()]).size).toBe(KEYS);
  });

  it('keeps the white tails clear of the black keys', () => {
    const blackHalf = KEY.blackWidth / 2;
    blackKeys().forEach((black) => {
      const gap = keyX(black) - keyX(black - 1) - blackHalf;
      expect(gap).toBeGreaterThan(KEY_PLAN.notchEdge);
    });
    const tailEdge = Math.max(...whiteOutline('both').map(([x]) => Math.abs(x)));
    expect(tailEdge).toBeCloseTo(KEY.whiteWidth / 2, DIGITS);
  });

  it('runs the key sticks side by side without overlap', () => {
    ALL_KEYS.slice(1).forEach((key) => {
      expect(stickBounds(key).minX).toBeGreaterThan(stickBounds(key - 1).maxX);
    });
    expect(stickBounds(1).minZ).toBeCloseTo(KEY.frontZ - KEY.length, DIGITS);
  });

  it('sets the front punching one key dip under the key and the balance punching at the pivot', () => {
    const [front, balance] = punchings(PLAYED_KEY.middle);
    expect(front.position[1] + front.height).toBeCloseTo(KEY_PLAN.bottom - mm(KEY_DIP_MM), DIGITS);
    expect(balance.position[1] + balance.height).toBeCloseTo(KEY_PLAN.bottom, DIGITS);
    expect(balance.position[2]).toBe(KEY_LEVER.pivotZ);
    expect(balance.position[1]).toBeLessThan(KEY_LEVER.pivotY);
  });

  it('labels the keyboard on a white key to the right of the played key', () => {
    Object.values(PLAYED_KEY).forEach((played) => {
      const key = keyboardLabelKey(played);
      expect(key).toBeGreaterThan(played);
      expect(isBlackKey(key)).toBe(false);
    });
  });
});
