import { describe, expect, it } from 'vitest';
import { Object3D, Vector3 } from 'three';
import { toRadians } from '@core/math';
import { applyBoatPose } from './pose';

function bowDirection(object: Object3D): Vector3 {
  object.updateMatrixWorld(true);
  return new Vector3(1, 0, 0).transformDirection(object.matrixWorld);
}

describe('boat pose', () => {
  it('places the boat at its route point raised by the heave', () => {
    const boat = new Object3D();
    applyBoatPose(boat, { position: [10, 0, -4], heading: 0 }, { heave: 0.2, trim: 0 });
    expect(boat.position.toArray()).toEqual([10, 0.2, -4]);
  });

  it('points the bow along the heading, turning toward +z as the heading grows', () => {
    const boat = new Object3D();
    const heading = toRadians(30);
    applyBoatPose(boat, { position: [0, 0, 0], heading }, { heave: 0, trim: 0 });
    const bow = bowDirection(boat);
    expect(bow.x).toBeCloseTo(Math.cos(heading), 9);
    expect(bow.z).toBeCloseTo(Math.sin(heading), 9);
    const starboard = new Vector3(0, 0, 1).transformDirection(boat.matrixWorld);
    expect(starboard.x).toBeCloseTo(-Math.sin(heading), 9);
    expect(starboard.z).toBeCloseTo(Math.cos(heading), 9);
  });

  it('lifts the bow with a positive trim whatever the heading', () => {
    const boat = new Object3D();
    const trim = toRadians(6);
    applyBoatPose(boat, { position: [0, 0, 0], heading: toRadians(-20) }, { heave: 0, trim });
    const bow = bowDirection(boat);
    expect(bow.y).toBeCloseTo(Math.sin(trim), 9);
    expect(Math.atan2(bow.z, bow.x)).toBeCloseTo(toRadians(-20), 9);
  });
});
