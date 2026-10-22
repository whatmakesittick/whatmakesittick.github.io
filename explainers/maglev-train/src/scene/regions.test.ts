import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { REGION_IDS } from '../ids';
import type { AnchorId, RegionId } from '../ids';
import { ANCHOR_POINTS, CUT_X, TRAIN } from '../model';
import { buildRegions } from './regions';

const HELD_ANCHORS: readonly (readonly [RegionId, AnchorId])[] = [
  ['train', 'nose'],
  ['train', 'tail'],
  ['arm', 'arm'],
  ['arm', 'inset'],
  ['crossSection', 'cut'],
  ['lineUp', 'lineUp'],
];

function anchorPoint(id: AnchorId): Vector3 {
  return new Vector3(...ANCHOR_POINTS[id]);
}

describe('regions', () => {
  const regions = buildRegions();

  it('spans a filled box for every region', () => {
    REGION_IDS.forEach((id) => {
      const size = regions[id].getSize(new Vector3());
      expect(Math.min(size.x, size.y, size.z), id).toBeGreaterThan(0);
    });
  });

  it('holds each scene anchor in the region framed around it', () => {
    HELD_ANCHORS.forEach(([region, anchor]) =>
      expect(regions[region].containsPoint(anchorPoint(anchor)), anchor).toBe(true),
    );
  });

  it('keeps the lead and rear sections inside the train, at their own ends', () => {
    expect(regions.train.containsBox(regions.front)).toBe(true);
    expect(regions.train.containsBox(regions.rear)).toBe(true);
    expect(regions.front.max.x).toBeCloseTo(TRAIN.noseX);
    expect(regions.rear.min.x).toBeCloseTo(TRAIN.tailX);
  });

  it('ends the cross-section and the line-up at the cut face', () => {
    expect(regions.crossSection.max.x).toBeCloseTo(CUT_X);
    expect(regions.lineUp.max.x).toBeCloseTo(CUT_X);
  });

  it('hands out fresh boxes every time', () => {
    const first = buildRegions();
    first.train.expandByScalar(1);
    expect(buildRegions().train.equals(first.train)).toBe(false);
  });
});
