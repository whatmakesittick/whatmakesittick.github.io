import { describe, expect, it } from 'vitest';
import { Object3D, Vector3 } from 'three';
import { toRadians } from '@core/math';
import type { CarReading } from '../ids';
import { CAR } from '../model/layout';
import { applyCarPose } from './pose';

function car(roll: number, pitch: number): CarReading {
  return {
    position: [10, 2, 0],
    speed: 0,
    height: 2,
    roll,
    pitch,
    onGround: false,
    onRamp: true,
    airborne: false,
  };
}

function posed(roll: number, pitch: number): Object3D {
  const object = new Object3D();
  applyCarPose(object, car(roll, pitch));
  object.updateMatrixWorld(true);
  return object;
}

function axis(object: Object3D, local: Vector3): Vector3 {
  return local.applyQuaternion(object.quaternion);
}

describe('car pose', () => {
  it('rides the body above the wheels when upright', () => {
    expect(posed(0, 0).position.toArray()).toEqual([10, 2 + CAR.rideHeight, 0]);
  });

  it('hangs the body below the track when inverted', () => {
    const object = posed(Math.PI, 0);
    expect(object.position.y).toBeCloseTo(2 - CAR.rideHeight, 9);
    expect(axis(object, new Vector3(0, 1, 0)).y).toBeCloseTo(-1, 9);
  });

  it('puts the right side down for a positive roll', () => {
    expect(axis(posed(Math.PI / 2, 0), new Vector3(0, 0, 1)).y).toBeCloseTo(-1, 9);
  });

  it('keeps the nose pointing up the ramp whether upright or inverted', () => {
    const pitch = toRadians(42);
    [0, Math.PI].forEach((roll) => {
      const nose = axis(posed(roll, pitch), new Vector3(1, 0, 0));
      expect(nose.x).toBeCloseTo(Math.cos(pitch), 9);
      expect(nose.y).toBeCloseTo(Math.sin(pitch), 9);
    });
  });
});
