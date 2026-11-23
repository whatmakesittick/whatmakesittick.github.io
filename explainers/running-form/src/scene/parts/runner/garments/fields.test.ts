import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { decodeFigure } from '@core/figure';
import { RestFrame } from '@core/figure/body/restFrame';
import { restPosed } from '../body/restPose';
import { PART_RULES } from '../partRules';
import { CHANNELS, runnerFields } from './fields';

const { athleteData } = await import('../figure/runner.data');
const figure = restPosed(decodeFigure(athleteData));
const frame = new RestFrame(figure);
const fields = runnerFields(figure, frame, PART_RULES);
const AXES = 3;
const CHANNEL = { waist: 0, armhole: 1, shorts: 2, sock: 3 } as const;
const NECK_EXTRA = 3;
const EXTENT = { cap: 0, hair: 1, side: 3 } as const;

function vertices(test: (point: Vector3) => boolean): number[] {
  const found: number[] = [];
  const point = new Vector3();
  for (let v = 0; v < figure.vertexCount; v++) {
    if (test(point.fromArray(figure.restPositions, v * AXES))) found.push(v);
  }
  return found;
}

function distance(v: number, channel: number): number {
  return fields.distances[v * CHANNELS + channel];
}

function singlet(v: number): number {
  return Math.min(
    distance(v, CHANNEL.waist),
    distance(v, CHANNEL.armhole),
    fields.extra[v * CHANNELS + NECK_EXTRA],
  );
}

function extent(v: number, channel: number): number {
  return fields.extents[v * CHANNELS + channel];
}

describe('runner garment fields', () => {
  it('leaves no bare skin between the singlet and the shorts around the waist', () => {
    const waist = vertices((p) => p.y > 0.95 && p.y < 1.15 && Math.abs(p.x) < 0.17);
    expect(waist.length).toBeGreaterThan(50);
    waist.forEach((v) =>
      expect(Math.max(singlet(v), distance(v, CHANNEL.shorts))).toBeGreaterThanOrEqual(0),
    );
  });

  it('keeps the arms, the hands and the head out of the singlet and the shorts', () => {
    const wrist = frame.joint('r_wrist');
    const hand = vertices((p) => p.distanceTo(wrist) < 0.06);
    hand.forEach((v) => {
      expect(singlet(v)).toBeLessThan(0);
      expect(distance(v, CHANNEL.shorts)).toBeLessThan(0);
    });
  });

  it('puts socks on the ankles and not on the knees', () => {
    const ankle = frame.joint('r_foot');
    const knee = frame.joint('r_lowleg');
    vertices((p) => p.distanceTo(ankle) < 0.04).forEach((v) =>
      expect(distance(v, CHANNEL.sock)).toBeGreaterThan(0),
    );
    vertices((p) => p.distanceTo(knee) < 0.06).forEach((v) =>
      expect(distance(v, CHANNEL.sock)).toBeLessThan(0),
    );
  });

  it('covers the crown with the cap and keeps the ears and the face bare', () => {
    const top = frame.joint('c_head_null');
    const eye = frame.joint('r_eye');
    vertices((p) => p.distanceTo(top) < 0.03).forEach((v) =>
      expect(extent(v, EXTENT.cap)).toBeGreaterThan(0),
    );
    vertices((p) => Math.abs(p.x) > 0.084 && p.y > 1.57 && p.y < 1.65).forEach((v) => {
      expect(extent(v, EXTENT.cap)).toBeLessThan(0);
      expect(extent(v, EXTENT.hair)).toBeLessThan(0);
    });
    vertices((p) => p.distanceTo(eye) < 0.03).forEach((v) => {
      expect(extent(v, EXTENT.cap)).toBeLessThan(0);
      expect(extent(v, EXTENT.hair)).toBeLessThan(0);
    });
  });

  it('marks the runner side of every vertex for the right and left accents', () => {
    vertices((p) => Math.abs(p.x) > 0.05).forEach((v) =>
      expect(Math.sign(extent(v, EXTENT.side))).toBe(Math.sign(figure.restPositions[v * AXES])),
    );
  });
});
