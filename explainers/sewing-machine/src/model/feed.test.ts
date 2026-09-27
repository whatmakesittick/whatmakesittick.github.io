import { describe, expect, it } from 'vitest';
import { PHASE_RANGES } from './cycle';
import { FABRIC_TOP } from './fabric';
import {
  FEED_DOG_TIP,
  STITCH_LENGTH,
  clampStitchLength,
  fabricTravel,
  feedDogPosition,
  stitchesPerCm,
} from './feed';
import { needleTipHeight } from './needle';

const STEP = 0.5;
const LENGTH = STITCH_LENGTH.default;
const ANGLES = Array.from({ length: 360 / STEP }, (_, index) => index * STEP);

describe('fabricTravel', () => {
  it('moves the fabric back one stitch length during the feed phase', () => {
    expect(fabricTravel(0, LENGTH)).toBe(0);
    expect(fabricTravel(PHASE_RANGES.feed.end, LENGTH)).toBe(LENGTH);
    expect(fabricTravel(PHASE_RANGES.set.end - STEP, LENGTH)).toBe(LENGTH);
  });

  it('feeds only while the needle is out of the fabric', () => {
    const moving = ANGLES.filter(
      (angle) => fabricTravel(angle + STEP, LENGTH) !== fabricTravel(angle, LENGTH),
    );
    expect(moving.length).toBeGreaterThan(0);
    moving.forEach((angle) => expect(needleTipHeight(angle)).toBeGreaterThan(FABRIC_TOP));
  });

  it('feeds only during the feed phase', () => {
    ANGLES.filter((angle) => angle >= PHASE_RANGES.feed.end).forEach((angle) =>
      expect(fabricTravel(angle, LENGTH)).toBe(LENGTH),
    );
  });
});

describe('feedDogPosition', () => {
  it('rises through the plate only while the needle is above the fabric', () => {
    ANGLES.filter((angle) => feedDogPosition(angle, LENGTH).lift > 0).forEach((angle) =>
      expect(needleTipHeight(angle)).toBeGreaterThan(FABRIC_TOP),
    );
  });

  it('moves in four steps: up, back, down and forward again', () => {
    const start = feedDogPosition(0, LENGTH);
    const raised = feedDogPosition(10, LENGTH);
    const pushed = feedDogPosition(52, LENGTH);
    const dropped = feedDogPosition(200, LENGTH);
    expect(start).toEqual({ lift: FEED_DOG_TIP.lowered, shift: LENGTH / 2 });
    expect(raised.lift).toBe(FEED_DOG_TIP.raised);
    expect(pushed.shift).toBeCloseTo(-LENGTH / 2);
    expect(dropped).toEqual({ lift: FEED_DOG_TIP.lowered, shift: -LENGTH / 2 });
    expect(feedDogPosition(340, LENGTH).lift).toBe(FEED_DOG_TIP.lowered);
    expect(feedDogPosition(340, LENGTH).shift).toBeCloseTo(0);
  });

  it('grips the fabric while it pushes', () => {
    [20, 30, 40].forEach((angle) =>
      expect(feedDogPosition(angle, LENGTH).shift).toBeCloseTo(
        LENGTH / 2 - fabricTravel(angle, LENGTH),
      ),
    );
  });
});

describe('stitch length', () => {
  it('stays within the dial range', () => {
    expect(clampStitchLength(0.2)).toBe(STITCH_LENGTH.min);
    expect(clampStitchLength(9)).toBe(STITCH_LENGTH.max);
    expect(clampStitchLength(3)).toBe(3);
  });

  it('makes four stitches per centimetre at 2.5 mm', () => {
    expect(stitchesPerCm(2.5)).toBe(4);
  });
});
