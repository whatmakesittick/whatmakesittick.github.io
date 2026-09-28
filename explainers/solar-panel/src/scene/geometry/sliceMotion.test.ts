import { describe, expect, it } from 'vitest';
import { CARRIER_FLOW, FINGER_UM, layerBottomUm, layerTopUm, um } from '../../model';
import { fingerTopCm } from './sliceGeometry';
import { carrierRoute, cutSide, photonPath, pointOnRoute, routeLength } from './sliceMotion';

const VIEW = [-0.45, 0.4, 1] as const;

describe('slice motion', () => {
  it('shows the section on the face the cell view can see', () => {
    expect(cutSide(0, VIEW)).toBe(-1);
    expect(cutSide(35, VIEW)).toBe(-1);
    expect(cutSide(90, VIEW)).toBe(1);
  });

  it('sends photons in through the front face, bent toward the normal inside the silicon', () => {
    const path = photonPath([0.5, 0.2, 0.84], 3.9);
    if (!path) throw new Error('expected a path');
    expect(path.outside.h).toBeLessThan(0);
    expect(path.outside.x).toBeLessThan(0);
    expect(Math.abs(path.inside.x)).toBeLessThan(Math.abs(path.outside.x));
    expect(path.inside.h).toBeLessThan(0);
    expect(photonPath([0, 1, -0.1], 3.9)).toBeNull();
  });

  it('drifts each carrier to the contact the frozen model names', () => {
    const start = { x: 40, h: 10 };
    const electron = carrierRoute('electron', start);
    const hole = carrierRoute('hole', start);
    const rear = um((layerTopUm('rearContact') + layerBottomUm('rearContact')) / 2);
    const emitterTop = um(layerTopUm('emitter'));
    expect(CARRIER_FLOW.electronsTo).toBe('rearContact');
    expect(electron[electron.length - 1].h).toBeCloseTo(rear, 6);
    expect(electron[electron.length - 1].h).toBeLessThan(start.h);
    const [, up, along, into] = hole;
    expect(up.h).toBeGreaterThan(start.h);
    expect(up.h).toBeLessThan(emitterTop);
    expect(along.x).toBeCloseTo(um(FINGER_UM.x), 6);
    expect(into.h).toBeCloseTo(fingerTopCm(), 6);
  });

  it('walks along a route by distance', () => {
    const route = [
      { x: 0, h: 0 },
      { x: 0, h: 10 },
      { x: 10, h: 10 },
    ];
    expect(routeLength(route)).toBe(20);
    expect(pointOnRoute(route, 15)).toEqual({ x: 5, h: 10 });
    expect(pointOnRoute(route, 50)).toEqual({ x: 10, h: 10 });
  });
});
