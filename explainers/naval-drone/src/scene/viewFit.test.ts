import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { toRadians } from '@core/math';
import {
  boatToWorld,
  direction,
  fitDistance,
  fitsView,
  lookUpLimits,
  nearestFit,
  pivotNear,
  polarOf,
} from './viewFit';

const SLOPES = { vertical: 0.2, horizontal: 0.34 };
const LEVEL = { position: [10, 0.5, -4] as const, heading: 0, trim: 0 };

describe('view fitting', () => {
  it('turns boat points into the world with the heading, the trim only when pitched', () => {
    expect(boatToWorld(LEVEL, [1, 0, 0], true).toArray()).toEqual([11, 0.5, -4]);
    const turned = boatToWorld({ ...LEVEL, heading: Math.PI / 2 }, [1, 0, 0], false);
    expect(turned.x).toBeCloseTo(10, 9);
    expect(turned.z).toBeCloseTo(-3, 9);
    const trimmed = { ...LEVEL, trim: toRadians(10) };
    expect(boatToWorld(trimmed, [-2, 0, 0], true).y).toBeLessThan(0.5);
    expect(boatToWorld(trimmed, [-2, 0, 0], false).y).toBe(0.5);
  });

  it('points a direction from its azimuth and elevation', () => {
    const up = direction(0, toRadians(30));
    expect(up.y).toBeCloseTo(0.5, 9);
    expect(direction(Math.PI / 2, 0).z).toBeCloseTo(1, 9);
  });

  it('fits a width across the stage', () => {
    expect(fitDistance(6.8, SLOPES)).toBeCloseTo(10, 9);
  });

  it('keeps points in front of the camera and inside the frame', () => {
    const pose = { position: new Vector3(0, 0, 0), target: new Vector3(10, 0, 0) };
    expect(fitsView(pose, [new Vector3(10, 1, 2)], SLOPES, 1)).toBe(true);
    expect(fitsView(pose, [new Vector3(10, 3, 0)], SLOPES, 1)).toBe(false);
    expect(fitsView(pose, [new Vector3(-10, 0, 0)], SLOPES, 1)).toBe(false);
  });

  it('finds the nearest distance that fits, or the farthest allowed', () => {
    const poseAt = (distance: number) => ({
      position: new Vector3(-distance, 0, 0),
      target: new Vector3(0, 0, 0),
    });
    const point = [new Vector3(0, 2, 0)];
    const near = nearestFit(poseAt, (pose) => fitsView(pose, point, SLOPES, 1), {
      min: 1,
      max: 100,
    });
    expect(near.position.x).toBeCloseTo(-10, 3);
    const far = nearestFit(poseAt, () => false, { min: 1, max: 100 });
    expect(far.position.x).toBeCloseTo(-100, 6);
  });

  it('turns the camera around the point of its view nearest the subject', () => {
    const pose = { position: new Vector3(0, 10, 0), target: new Vector3(100, 10, 0) };
    const pivoted = pivotNear(pose, new Vector3(30, 2, 5));
    expect(pivoted.position.toArray()).toEqual([0, 10, 0]);
    expect(pivoted.target.toArray()).toEqual([30, 10, 0]);
  });

  it('lets a camera look up only as far as its view asks, and never under the sea', () => {
    const level = { position: new Vector3(-10, 5, 0), target: new Vector3(0, 0, 0) };
    expect(lookUpLimits(level, Math.PI / 2, 1)).toEqual({
      maxPolarAngle: Math.PI / 2,
      maxDistance: null,
    });
    const upward = { position: new Vector3(-40, 4, 0), target: new Vector3(0, 12, 0) };
    const limits = lookUpLimits(upward, Math.PI / 2, 1);
    expect(limits.maxPolarAngle).toBeGreaterThan(polarOf(upward));
    expect(limits.maxPolarAngle).toBeLessThan(polarOf(upward) + 0.01);
    const lowest = 12 + (limits.maxDistance ?? 0) * Math.cos(limits.maxPolarAngle);
    expect(lowest).toBeCloseTo(1, 9);
  });
});
