import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS, REGION_IDS } from '../ids';
import { PERSON_HEIGHT_M, PERSON_POSITION } from '../model';
import { CAMERA_VIEWS, HERO_REGION, heroBounds } from './cameraViews';

describe('camera views', () => {
  it('frames each view on a known region and keeps them all fixed', () => {
    CAMERA_VIEW_IDS.forEach((view) => {
      const { region } = CAMERA_VIEWS[view];
      expect([...REGION_IDS, HERO_REGION]).toContain(region);
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
});
