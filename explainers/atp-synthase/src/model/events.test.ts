import { describe, expect, it } from 'vitest';
import { EVENT_IDS } from '../ids';
import { aerobicShare, anaerobicShare, isSingleValue, middleOf } from './events';

describe('aerobic share by event', () => {
  it('gives every event a range inside 0 to 100%', () => {
    EVENT_IDS.forEach((id) => {
      const { low, high } = aerobicShare(id);
      expect(low, id).toBeGreaterThan(0);
      expect(high, id).toBeLessThanOrEqual(100);
      expect(low, id).toBeLessThanOrEqual(high);
    });
  });

  it('leans more on oxygen the longer the race', () => {
    const middles = EVENT_IDS.map((id) => middleOf(aerobicShare(id)));
    middles.slice(1).forEach((middle, index) => expect(middle).toBeGreaterThan(middles[index]));
  });

  it('keeps the sheet numbers for the sprint, the 800 m and the marathon', () => {
    expect(aerobicShare('m100')).toEqual({ low: 10, high: 20 });
    expect(aerobicShare('m800')).toEqual({ low: 66, high: 66 });
    expect(aerobicShare('marathon')).toEqual({ low: 99, high: 99 });
  });

  it('flips the range for the share without oxygen', () => {
    expect(anaerobicShare('m100')).toEqual({ low: 80, high: 90 });
    expect(anaerobicShare('m400')).toEqual({ low: 55, high: 60 });
    expect(anaerobicShare('marathon')).toEqual({ low: 1, high: 1 });
  });

  it('fills the bar to the middle of the range', () => {
    expect(middleOf(aerobicShare('m100'))).toBe(15);
    expect(middleOf(aerobicShare('m1500'))).toBe(82.5);
  });

  it('tells a single number from a range', () => {
    expect(isSingleValue(aerobicShare('m200'))).toBe(true);
    expect(isSingleValue(aerobicShare('m400'))).toBe(false);
  });
});
