import { Box3, Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CAR, CAR_ANCHORS, MOMENTS, SITE_ANCHORS, carAt, rampPoint } from '../model';
import { applyCarPose } from './pose';
import { carRegion, staticRegions } from './regions';

const ABOVE_GROUND = 0.5;

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
  it('hold the ramp, the arc to the pad and the whole run', () => {
    const regions = staticRegions();
    expect(regions.ramp.containsPoint(new Vector3(...rampPoint(0.5)))).toBe(true);
    expect(regions.ramp.containsPoint(new Vector3(...rampPoint(1)))).toBe(true);
    expect(regions.arc.containsPoint(new Vector3(...carAt(MOMENTS.peak).position))).toBe(true);
    expect(regions.arc.containsPoint(new Vector3(...SITE_ANCHORS.pad).setY(ABOVE_GROUND))).toBe(
      true,
    );
    expect(regions.site.containsBox(regions.ramp)).toBe(true);
    expect(regions.site.containsBox(regions.arc)).toBe(true);
    const stop = new Vector3(...carAt(MOMENTS.stopped).position).setY(ABOVE_GROUND);
    expect(regions.site.containsPoint(stop)).toBe(true);
  });

  it('hands out fresh boxes every time', () => {
    const first = staticRegions();
    first.site.expandByScalar(100);
    expect(staticRegions().site.equals(first.site)).toBe(false);
  });
});

describe('car regions', () => {
  it('follow the car along the run and hold its centre', () => {
    [0, 3.5, MOMENTS.peak, MOMENTS.stopped].forEach((seconds) => {
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
