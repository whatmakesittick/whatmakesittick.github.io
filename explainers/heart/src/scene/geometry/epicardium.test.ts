import { Color, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { EPICARDIUM } from '../constants';
import { ellipsoid, carve, capsule } from './field';
import { epicardiumPainter, fatShare, occlusion } from './epicardium';

describe('epicardium paint', () => {
  it('tints the surface with fat next to a coronary artery and not far away', () => {
    const vessels = [{ points: [new Vector3(0, 0, 20)], radius: 2 }];
    expect(fatShare(vessels, EPICARDIUM, 0, 0, 20)).toBeCloseTo(EPICARDIUM.fatShare, 5);
    expect(fatShare(vessels, EPICARDIUM, 0, 20, 0)).toBe(0);
  });

  it('darkens creases and leaves open surfaces bright', () => {
    const ball = ellipsoid([0, 0, 0], [20, 20, 20]);
    expect(occlusion(ball, EPICARDIUM, [0, 0, 20], [0, 0, 1])).toBeCloseTo(1, 5);
    const grooved = carve(ball, [capsule([-30, 0, 21], [30, 0, 21], 4)], 1);
    expect(occlusion(grooved, EPICARDIUM, [0, 0, 17.2], [0, 0, 1])).toBeLessThan(1);
  });

  it('paints muscle colour on a clean surface', () => {
    const painter = epicardiumPainter(ellipsoid([0, 0, 0], [20, 20, 20]), [], EPICARDIUM);
    const muscle = new Color(EPICARDIUM.muscle);
    const [r, g, b] = painter(0, 0, 20, 0, 0, 1);
    expect(r).toBeCloseTo(muscle.r, 3);
    expect(g).toBeCloseTo(muscle.g, 3);
    expect(b).toBeCloseTo(muscle.b, 3);
  });
});
