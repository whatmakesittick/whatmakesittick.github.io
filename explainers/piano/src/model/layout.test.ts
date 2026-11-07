import { describe, expect, it } from 'vitest';
import { REGION_IDS, REGISTER_IDS } from '../ids';
import { ACTION_RATIO, BLOW_MM, KEYS, LET_OFF_MM, PLAYED_KEY } from './constants';
import {
  CASE,
  HAMMER,
  JACK_Z,
  KEYBOARD_WIDTH,
  KNUCKLE_ARM,
  LEVER_CHAIN,
  SHANK,
  SHIFT_MM,
  STRIKE_Z,
  STRINGS,
  STRING_Y,
  hammerAngleForRise,
  hasDamper,
  headTopOffset,
  insetCentre,
  isBlackKey,
  jackAnchor,
  keyX,
  regionSpecFor,
  restAnchorPoint,
  speakingLength,
  strikeShare,
  stringPath,
  stringsPerNote,
} from './layout';
import { mm } from './scale';

const KEY_NUMBERS = Array.from({ length: KEYS }, (_, index) => index + 1);
const DIGITS = 6;
const NO_EXTRAS = { ghost: false, inset: false };

function inside(value: number, [min, max]: readonly [number, number]): boolean {
  return value >= min && value <= max;
}

describe('keyboard layout', () => {
  it('lays 88 keys left to right with 36 black ones', () => {
    const xs = KEY_NUMBERS.map(keyX);
    xs.slice(1).forEach((x, index) => expect(x).toBeGreaterThan(xs[index]));
    expect(KEY_NUMBERS.filter(isBlackKey)).toHaveLength(36);
    expect(isBlackKey(PLAYED_KEY.middle)).toBe(false);
  });

  it('keeps the keyboard inside the case with bass on the left', () => {
    expect(keyX(1)).toBeGreaterThan(CASE.leftX);
    expect(keyX(KEYS)).toBeLessThan(CASE.rightX);
    expect(keyX(1)).toBeCloseTo(-KEYBOARD_WIDTH / 2 + KEYBOARD_WIDTH / 104, DIGITS);
    expect(keyX(PLAYED_KEY.bass)).toBeLessThan(keyX(PLAYED_KEY.middle));
    expect(keyX(PLAYED_KEY.treble)).toBeGreaterThan(0);
  });
});

describe('action geometry', () => {
  it('chains the levers to the action ratio at let-off', () => {
    const keyAtLetOff = (BLOW_MM - LET_OFF_MM) / ACTION_RATIO;
    const knuckleRise = KNUCKLE_ARM * Math.sin(hammerAngleForRise(BLOW_MM - LET_OFF_MM));
    expect(knuckleRise).toBeCloseTo(mm(keyAtLetOff * LEVER_CHAIN), DIGITS);
    expect(HAMMER.pivotZ - KNUCKLE_ARM).toBeCloseTo(JACK_Z, DIGITS);
  });

  it('lifts the head top exactly to the string at the strike, from below', () => {
    const [y, z] = headTopOffset(hammerAngleForRise(BLOW_MM));
    expect(HAMMER.pivotY + y).toBeCloseTo(STRING_Y, DIGITS);
    expect(HAMMER.pivotZ + z).toBeCloseTo(STRIKE_Z, DIGITS);
    expect(HAMMER.pivotY + headTopOffset(0)[0]).toBeCloseTo(STRING_Y - mm(BLOW_MM), DIGITS);
    expect(SHANK).toBeCloseTo(0.13, DIGITS);
  });

  it('shifts the action by half a string spacing for una corda', () => {
    expect(mm(SHIFT_MM)).toBeCloseTo(STRINGS.unisonSpacing / 2, DIGITS);
  });
});

describe('strings', () => {
  it('counts about 230 strings: single, double, then triple', () => {
    const total = KEY_NUMBERS.reduce((sum, key) => sum + stringsPerNote(key), 0);
    expect(total).toBe(229);
    expect(stringsPerNote(PLAYED_KEY.bass)).toBe(2);
    expect(stringsPerNote(PLAYED_KEY.middle)).toBe(3);
  });

  it('runs from about 2 m in the bass to about 5 cm at the top', () => {
    expect(speakingLength(1)).toBeCloseTo(2.01, DIGITS);
    expect(speakingLength(KEYS)).toBeCloseTo(0.049, DIGITS);
    KEY_NUMBERS.slice(1).forEach((key) =>
      expect(speakingLength(key)).toBeLessThan(speakingLength(key - 1)),
    );
  });

  it('strikes at one eighth up to A4 and less beyond', () => {
    expect(strikeShare(PLAYED_KEY.middle)).toBe(1 / 8);
    expect(strikeShare(KEYS)).toBeCloseTo(1 / 12, DIGITS);
    expect(strikeShare(PLAYED_KEY.treble)).toBeLessThan(1 / 8);
  });

  it('puts every strike point over its hammer and keeps the strings in the case', () => {
    KEY_NUMBERS.forEach((key) => {
      const { front, strike, back, hitch } = stringPath(key);
      expect(strike[0]).toBeCloseTo(keyX(key), DIGITS);
      expect(strike[2]).toBeCloseTo(STRIKE_Z, DIGITS);
      expect(front[2]).toBeGreaterThan(back[2]);
      [front, back, hitch].forEach(([x, , z]) => {
        expect(inside(x, [CASE.leftX, CASE.rightX])).toBe(true);
        expect(inside(z, [CASE.tailZ, CASE.frontZ])).toBe(true);
      });
    });
  });

  it('raises the wound bass strings and fans them toward the middle of the tail', () => {
    const bass = stringPath(1);
    expect(bass.strike[1]).toBeGreaterThan(STRING_Y);
    expect(bass.back[0]).toBeGreaterThan(bass.front[0]);
    const treble = stringPath(KEYS);
    expect(treble.back[0]).toBeCloseTo(treble.front[0], DIGITS);
  });

  it('gives dampers to the keys up to 67 only', () => {
    expect(KEY_NUMBERS.filter(hasDamper)).toHaveLength(67);
    expect(hasDamper(PLAYED_KEY.treble)).toBe(false);
  });
});

describe('regions and anchors', () => {
  it('spans every region for every played key', () => {
    REGISTER_IDS.forEach((register) =>
      REGION_IDS.forEach((id) => {
        const { x, y, z } = regionSpecFor(id, PLAYED_KEY[register], NO_EXTRAS);
        [x, y, z].forEach(([min, max]) => expect(max).toBeGreaterThan(min));
      }),
    );
  });

  it('keeps each rest anchor inside the region that frames it', () => {
    const key = PLAYED_KEY.middle;
    const framed = [
      ['key', 'action'],
      ['hammer', 'escapement'],
      ['jack', 'escapement'],
      ['damper', 'dampers'],
      ['bridge', 'string'],
      ['lineUp', 'lineUp'],
    ] as const;
    framed.forEach(([anchor, region]) => {
      const point = restAnchorPoint(anchor, key);
      const { x, y, z } = regionSpecFor(region, key, NO_EXTRAS);
      expect(inside(point[0], x) && inside(point[1], y) && inside(point[2], z)).toBe(true);
    });
  });

  it('grows the action region for the ghost and the escapement region for the inset', () => {
    const key = PLAYED_KEY.middle;
    const plain = regionSpecFor('action', key, NO_EXTRAS);
    const ghost = regionSpecFor('action', key, { ghost: true, inset: false });
    expect(ghost.z[1]).toBeGreaterThan(plain.z[1]);
    const panel = insetCentre(key);
    const inset = regionSpecFor('escapement', key, { ghost: false, inset: true });
    expect(inside(panel[1], inset.y) && inside(panel[2], inset.z)).toBe(true);
  });

  it('moves the inset and the jack anchor with the played key', () => {
    REGISTER_IDS.forEach((register) => {
      const key = PLAYED_KEY[register];
      expect(insetCentre(key)[0] - keyX(key)).toBeCloseTo(insetCentre(1)[0] - keyX(1), DIGITS);
      expect(jackAnchor(key)[0]).toBeCloseTo(keyX(key), DIGITS);
    });
  });
});
