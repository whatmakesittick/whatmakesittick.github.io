import { describe, expect, it } from 'vitest';
import { EasedLength } from './easedLength';

const FRAME = 1 / 60;
const ENOUGH_FRAMES = 240;

describe('eased arrow length', () => {
  it('starts settled and does not move without a new goal', () => {
    const length = new EasedLength();
    expect(length.settled).toBe(true);
    expect(length.advance(FRAME)).toBe(false);
  });

  it('eases toward its goal and reports false once it has arrived', () => {
    const length = new EasedLength();
    length.aim(2);
    expect(length.advance(FRAME)).toBe(true);
    expect(length.value).toBeGreaterThan(0);
    expect(length.value).toBeLessThan(2);
    let frames = 0;
    while (length.advance(FRAME) && frames < ENOUGH_FRAMES) frames++;
    expect(frames).toBeLessThan(ENOUGH_FRAMES);
    expect(length.value).toBe(2);
    expect(length.advance(FRAME)).toBe(false);
  });

  it('jumps straight to a snapped value', () => {
    const length = new EasedLength();
    length.aim(3);
    length.snap(0);
    expect(length.settled).toBe(true);
    expect(length.value).toBe(0);
  });
});
