import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS, REGION_IDS } from '../ids';
import { PERSON_HEIGHT_M, PERSON_POSITION } from '../model';
import {
  CAMERA_VIEWS,
  COMPRESSOR_OFFSET_REGION,
  HERO_REGION,
  REAR_CLOSE_REGION,
  STARTER_CLOSE_REGION,
  TURBINES_OFFSET_REGION,
  heroBounds,
  starterCloseBox,
  viewRegionBox,
} from './cameraViews';

const OFFSET_REGIONS = [COMPRESSOR_OFFSET_REGION, TURBINES_OFFSET_REGION];

describe('camera views', () => {
  it('frames each view on a known region and keeps them all fixed', () => {
    CAMERA_VIEW_IDS.forEach((view) => {
      const { region } = CAMERA_VIEWS[view];
      expect([
        ...REGION_IDS,
        HERO_REGION,
        REAR_CLOSE_REGION,
        STARTER_CLOSE_REGION,
        ...OFFSET_REGIONS,
      ]).toContain(region);
      expect(CAMERA_VIEWS[view].follow).toBeUndefined();
    });
  });

  it('frames the hero view on the fan face together with the person', () => {
    const fanFace = new Box3(new Vector3(-2.8, 0.2, -2.4), new Vector3(-2.07, 5, 2.4));
    const bounds = heroBounds(fanFace);
    const [x, , z] = PERSON_POSITION;
    expect(bounds.containsPoint(new Vector3(x, PERSON_HEIGHT_M, z))).toBe(true);
    expect(bounds.containsBox(fanFace)).toBe(true);
  });

  it('shifts the offset regions sideways without resizing them', () => {
    const region = () => new Box3(new Vector3(0, 0, 0), new Vector3(4, 2, 2));
    const compressor = viewRegionBox(COMPRESSOR_OFFSET_REGION, region);
    const turbines = viewRegionBox(TURBINES_OFFSET_REGION, region);
    expect(compressor.getSize(new Vector3()).x).toBe(4);
    expect(compressor.min.x).toBeGreaterThan(0);
    expect(turbines.min.x).toBeGreaterThan(compressor.min.x);
    expect(viewRegionBox('fanFace', region).equals(region())).toBe(true);
  });

  it('frames the rear view tighter than the rear region, on the nozzle end', () => {
    const rear = new Box3(new Vector3(1.12, 0.2, -2.4), new Vector3(3.64, 5, 2.4));
    const close = viewRegionBox(REAR_CLOSE_REGION, () => rear);
    expect(close.getSize(new Vector3()).y).toBeLessThan(rear.getSize(new Vector3()).y);
    expect(close.max.x).toBeGreaterThan(2.8);
  });

  it('frames the starter view on the gearbox, its radial shaft and the starter', () => {
    const box = viewRegionBox(STARTER_CLOSE_REGION, () => new Box3());
    expect(box.equals(starterCloseBox())).toBe(true);
    [
      new Vector3(-1.5, 2.6, 0.2),
      new Vector3(-0.5, 1.855, 0.43),
      new Vector3(0.25, 1.855, 0.43),
    ].forEach((point) => expect(box.containsPoint(point)).toBe(true));
    expect(CAMERA_VIEWS.starter.direction).toSatisfy(([, y]: number[]) => y < 0);
  });
});
