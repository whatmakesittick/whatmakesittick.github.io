import { describe, expect, it } from 'vitest';
import { Object3D } from 'three';
import { CLOSE_UP, CloseUp, Reveal, closeUpFactor, opensUp } from './closeUp';

const MASK_VIEW_M = 0.85;
const WAFER_VIEW_M = 1.9;
const FAR_VIEW_M = 10.9;

const MIDWAY = (CLOSE_UP.nearM + CLOSE_UP.farM) / 2;

describe('close-up factor', () => {
  it('keeps full size at and beyond the far distance', () => {
    expect(closeUpFactor(CLOSE_UP.farM)).toBe(1);
    expect(closeUpFactor(CLOSE_UP.farM * 4)).toBe(1);
  });

  it('rests on the floor at and inside the close-up distance', () => {
    expect(closeUpFactor(CLOSE_UP.nearM)).toBe(CLOSE_UP.floor);
    expect(closeUpFactor(0)).toBe(CLOSE_UP.floor);
  });

  it('falls steadily in between', () => {
    expect(closeUpFactor(MIDWAY)).toBeCloseTo((CLOSE_UP.floor + 1) / 2, 9);
    expect(closeUpFactor(CLOSE_UP.nearM + 0.5)).toBeLessThan(closeUpFactor(CLOSE_UP.farM - 0.5));
  });

  it('reports a change only when the factor moves', () => {
    const closeUp = new CloseUp();
    expect(closeUp.follow(CLOSE_UP.farM)).toBe(false);
    expect(closeUp.follow(CLOSE_UP.nearM)).toBe(true);
    expect(closeUp.factor).toBe(CLOSE_UP.floor);
    expect(closeUp.follow(CLOSE_UP.nearM)).toBe(false);
  });
});

describe('reveal', () => {
  it('opens up in the close views only', () => {
    expect(opensUp(MASK_VIEW_M)).toBe(true);
    expect(opensUp(WAFER_VIEW_M)).toBe(true);
    expect(opensUp(CLOSE_UP.openBelowM)).toBe(false);
    expect(opensUp(FAR_VIEW_M)).toBe(false);
  });

  it('hides the covers while close and reports a change only when it flips', () => {
    const covers = [new Object3D(), new Object3D()];
    const reveal = new Reveal().add(...covers);
    expect(reveal.follow(FAR_VIEW_M)).toBe(false);
    expect(covers.every((cover) => cover.visible)).toBe(true);
    expect(reveal.follow(MASK_VIEW_M)).toBe(true);
    expect(covers.some((cover) => cover.visible)).toBe(false);
    expect(reveal.follow(WAFER_VIEW_M)).toBe(false);
    expect(reveal.follow(FAR_VIEW_M)).toBe(true);
    expect(covers.every((cover) => cover.visible)).toBe(true);
  });
});
