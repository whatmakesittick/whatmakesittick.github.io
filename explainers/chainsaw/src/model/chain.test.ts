import { describe, expect, it } from 'vitest';
import { CUTTERS } from './constants';
import { ANCHOR_POINTS, CHAIN_ELEMENTS, CHAIN_PATH, NOSE_X, pointOnLoop } from './chain';
import { CHAIN_LOOP_MM } from './drive';
import { CRANK_Y } from './scale';

const LOOP_M = CHAIN_LOOP_MM / 1000;

describe('chain path', () => {
  it('closes the 55-link loop round the sprocket and the nose', () => {
    const { run, noseArc, sprocketArc } = CHAIN_PATH;
    expect(2 * run + noseArc + sprocketArc).toBeCloseTo(LOOP_M, 9);
    expect(NOSE_X).toBeCloseTo(0.458, 3);
    expect(CHAIN_PATH.sprocketRadius).toBeCloseTo(0.02195, 5);
  });

  it('runs the top toward the nose and the bottom back to the saw', () => {
    const top = pointOnLoop(100);
    const bottom = pointOnLoop((CHAIN_PATH.run + CHAIN_PATH.noseArc + 0.1) * 1000);
    expect(top.y).toBeGreaterThan(CRANK_Y);
    expect(Math.cos(top.angle)).toBeGreaterThan(0.99);
    expect(bottom.y).toBeLessThan(CRANK_Y);
    expect(Math.cos(bottom.angle)).toBeLessThan(-0.99);
  });

  it('is continuous all round, including the wrap', () => {
    const step = 1;
    for (let mm = 0; mm < CHAIN_LOOP_MM; mm += step) {
      const a = pointOnLoop(mm);
      const b = pointOnLoop(mm + step);
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan((step / 1000) * 1.01);
    }
  });

  it('reaches the nose tip ahead of the nose centre', () => {
    const tip = pointOnLoop((CHAIN_PATH.run + CHAIN_PATH.noseArc / 2) * 1000);
    expect(tip.x).toBeGreaterThan(ANCHOR_POINTS.nose[0]);
  });
});

describe('chain elements', () => {
  it('carries 27 cutters on 55 drive links, alternating sides', () => {
    expect(CHAIN_ELEMENTS).toHaveLength(55);
    const cutters = CHAIN_ELEMENTS.filter((element) => element.kind !== 'plain');
    expect(cutters).toHaveLength(CUTTERS);
    expect(cutters.filter((element) => element.kind === 'cutterLeft')).toHaveLength(14);
    cutters.slice(1).forEach((cutter, index) => expect(cutter.kind).not.toBe(cutters[index].kind));
  });

  it('never puts two cutters next to each other across the joint', () => {
    expect(CHAIN_ELEMENTS[CHAIN_ELEMENTS.length - 1].kind).toBe('plain');
    expect(CHAIN_ELEMENTS[0].kind).not.toBe('plain');
  });
});
