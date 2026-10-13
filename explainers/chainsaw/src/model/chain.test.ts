import { describe, expect, it } from 'vitest';
import { CUTTERS } from './constants';
import {
  ANCHOR_POINTS,
  BAR_HEEL_HALF_HEIGHT,
  CHAIN_ELEMENTS,
  CHAIN_PATH,
  KICKBACK_BRANCH_CENTRE,
  KICKBACK_BRANCH_RADIUS,
  NOSE_RADIUS,
  NOSE_X,
  SPROCKET_RADIUS,
  pointOnLoop,
  railY,
} from './chain';
import { CHAIN_LOOP_MM } from './drive';
import { CRANK_Y } from './scale';

const LOOP_M = CHAIN_LOOP_MM / 1000;

describe('chain path', () => {
  it('closes the 55-link loop round the sprocket and the nose', () => {
    const total = CHAIN_PATH.segments.reduce((sum, length) => sum + length, 0);
    expect(total).toBeCloseTo(LOOP_M, 9);
    expect(NOSE_X).toBeCloseTo(0.4506, 4);
    expect(CHAIN_PATH.sprocketRadius).toBeCloseTo(0.02195, 5);
  });

  it('draws the bar 10 % deeper at the heel than the v2.1 bar, and its nose about 9 % taller', () => {
    const V21_HEEL_HALF_HEIGHT = 0.0247;
    const V21_NOSE_RADIUS = 0.0225;
    expect(BAR_HEEL_HALF_HEIGHT / V21_HEEL_HALF_HEIGHT).toBeCloseTo(1.1, 9);
    expect(NOSE_RADIUS / V21_NOSE_RADIUS).toBeCloseTo(1.089, 3);
    expect(BAR_HEEL_HALF_HEIGHT).toBeGreaterThan(SPROCKET_RADIUS);
  });

  it('rises from the sprocket onto the heel and tapers to the nose', () => {
    expect(railY(CHAIN_PATH.heelX, 'upper')).toBeCloseTo(CRANK_Y + BAR_HEEL_HALF_HEIGHT, 9);
    expect(railY(CHAIN_PATH.noseMeetX, 'upper')).toBeLessThan(CRANK_Y + BAR_HEEL_HALF_HEIGHT);
    expect(railY(0.3, 'lower')).toBeCloseTo(2 * CRANK_Y - railY(0.3, 'upper'), 9);
    const onRail = pointOnLoop((CHAIN_PATH.segments[0] + 0.1) * 1000);
    expect(onRail.y).toBeCloseTo(railY(onRail.x, 'upper'), 6);
  });

  it('keeps the kickback branch touching the nose at 45 degrees', () => {
    const [x, y] = KICKBACK_BRANCH_CENTRE;
    expect(Math.hypot(x - NOSE_X, y - CRANK_Y)).toBeCloseTo(
      NOSE_RADIUS + KICKBACK_BRANCH_RADIUS,
      9,
    );
    expect(x - NOSE_X).toBeCloseTo(y - CRANK_Y, 9);
  });

  it('runs the top toward the nose and the bottom back to the saw', () => {
    const top = pointOnLoop(200);
    const [climb, rail, noseArc] = CHAIN_PATH.segments;
    const bottom = pointOnLoop((climb + rail + noseArc + 0.1) * 1000);
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
    const [climb, rail, noseArc] = CHAIN_PATH.segments;
    const tip = pointOnLoop((climb + rail + noseArc / 2) * 1000);
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
