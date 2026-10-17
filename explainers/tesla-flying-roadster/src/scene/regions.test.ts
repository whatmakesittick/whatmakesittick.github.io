import { Box3, Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CAR, CAR_ANCHORS, MOMENTS, RAMP_LENGTH, SITE_ANCHORS, carAt, rampPoint } from '../model';
import type { MomentId } from '../ids';
import { applyCarPose } from './pose';
import { carRegion, staticRegions } from './regions';

const ABOVE_GROUND = 0.5;

function carPoint(moment: MomentId): Vector3 {
  const point = new Vector3(...carAt(MOMENTS[moment]).position);
  return point.setY(Math.max(point.y, ABOVE_GROUND));
}

function posedCar(seconds: number): Group {
  const car = new Group();
  applyCarPose(car, carAt(seconds));
  return car;
}

function worldPoint(car: Group, point: readonly [number, number, number]): Vector3 {
  car.updateWorldMatrix(true, false);
  return new Vector3(...point).applyMatrix4(car.matrixWorld);
}

describe('static regions', () => {
  it('hold the hook ramp and the arc down to the first landing box', () => {
    const { ramp, arc } = staticRegions();
    expect(ramp.containsPoint(new Vector3(...rampPoint(RAMP_LENGTH / 2)))).toBe(true);
    expect(ramp.containsPoint(new Vector3(...rampPoint(RAMP_LENGTH)))).toBe(true);
    expect(arc.containsBox(ramp)).toBe(true);
    (['inverted', 'leavesRamp', 'rollComplete', 'touchdown'] as const).forEach((moment) =>
      expect(arc.containsPoint(carPoint(moment))).toBe(true),
    );
    expect(arc.containsPoint(new Vector3(...SITE_ANCHORS.pad).setY(ABOVE_GROUND))).toBe(true);
  });

  it('hold the jump from the lift-off over the parked row to the landing', () => {
    const { jump } = staticRegions();
    (['liftOff', 'apex', 'twistComplete', 'landed'] as const).forEach((moment) =>
      expect(jump.containsPoint(carPoint(moment))).toBe(true),
    );
    expect(jump.containsPoint(new Vector3(...SITE_ANCHORS.row))).toBe(true);
  });

  it('hold the whole run in the site', () => {
    const { site, ramp, arc, jump } = staticRegions();
    [ramp, arc, jump].forEach((region) => expect(site.containsBox(region)).toBe(true));
    (['sixty', 'stopped'] as const).forEach((moment) =>
      expect(site.containsPoint(carPoint(moment))).toBe(true),
    );
  });

  it('hands out fresh boxes every time', () => {
    const first = staticRegions();
    first.site.expandByScalar(100);
    expect(staticRegions().site.equals(first.site)).toBe(false);
  });
});

describe('car regions', () => {
  it('follow the car along the run and hold its centre', () => {
    [0, MOMENTS.inverted, MOMENTS.apex, MOMENTS.stopped].forEach((seconds) => {
      const car = posedCar(seconds);
      const centre = worldPoint(car, CAR_ANCHORS.car);
      expect(carRegion('car', car).containsPoint(centre)).toBe(true);
      expect(carRegion('cabin', car).containsPoint(worldPoint(car, CAR_ANCHORS.tank))).toBe(true);
    });
  });

  it('turn with the car so the tail stays behind and the roof below when inverted', () => {
    const level = posedCar(0);
    expect(carRegion('tail', level).max.x).toBeLessThan(worldPoint(level, CAR_ANCHORS.car).x);
    const inverted = posedCar(MOMENTS.leavesRamp);
    const centre = worldPoint(inverted, CAR_ANCHORS.car);
    const underside = worldPoint(inverted, [0, 0, 0]);
    expect(centre.y).toBeLessThan(underside.y);
    expect(carRegion('car', inverted).containsPoint(underside)).toBe(true);
  });

  it('writes into the box it is given', () => {
    const target = new Box3();
    const car = posedCar(0);
    expect(carRegion('car', car, target)).toBe(target);
    expect(target.getSize(new Vector3()).x).toBeCloseTo(4.6);
    expect(target.min.y).toBeCloseTo(CAR.rideHeight);
  });
});
