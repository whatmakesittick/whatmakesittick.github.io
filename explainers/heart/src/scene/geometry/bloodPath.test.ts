import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { bloodPath, pointOnPath, tangentOnPath, zoneAt } from './bloodPath';
import type { PathLeg } from './bloodPath';

const LEGS: PathLeg[] = [
  {
    points: [
      [0, 100, 0],
      [0, 60, 0],
    ],
    radius: 4,
    zone: 'vein',
    chamber: false,
  },
  {
    points: [
      [0, 40, 0],
      [0, 20, 0],
    ],
    radius: 10,
    zone: 'atrium',
    chamber: true,
  },
  {
    points: [
      [0, 0, 0],
      [0, -20, 0],
    ],
    radius: 12,
    zone: 'ventricle',
    chamber: true,
  },
  {
    points: [
      [10, -10, 0],
      [15, 10, 0],
    ],
    radius: 8,
    zone: 'ventricle',
    chamber: true,
  },
  {
    points: [
      [15, 30, 0],
      [15, 80, 0],
    ],
    radius: 5,
    zone: 'artery',
    chamber: false,
  },
];

describe('blood paths', () => {
  const path = bloodPath(LEGS);

  it('samples the route with its zones in order', () => {
    expect(path.length).toBeGreaterThan(200);
    const order = ['vein', 'atrium', 'ventricle', 'artery'];
    let last = 0;
    for (const zone of path.zones) {
      expect(order.indexOf(zone)).toBeGreaterThanOrEqual(last);
      last = order.indexOf(zone);
    }
  });

  it('puts the gates where the zones change', () => {
    expect(path.gates.atrium).toBeLessThan(path.gates.ventricle);
    expect(path.gates.ventricle).toBeLessThan(path.gates.artery);
    expect(zoneAt(path, 0)).toBe('vein');
    expect(zoneAt(path, path.length)).toBe('artery');
  });

  it('finds points and directions along the route', () => {
    const start = pointOnPath(path, 0, new Vector3());
    expect(start.y).toBeCloseTo(100, 3);
    expect(tangentOnPath(path, 0, new Vector3()).y).toBeLessThan(-0.9);
    expect(path.radii[0]).toBe(4);
    expect(path.inChamber[0]).toBe(0);
  });
});
