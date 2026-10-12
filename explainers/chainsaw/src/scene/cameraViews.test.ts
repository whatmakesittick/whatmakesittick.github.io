import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS } from '../ids';
import { CAMERA_VIEWS, STAGE_VARIANTS, framedViews, stageVariant } from './cameraViews';

describe('camera views', () => {
  it('offers the six fixed views on their regions', () => {
    expect(Object.keys(CAMERA_VIEWS)).toEqual([...CAMERA_VIEW_IDS]);
    expect(CAMERA_VIEW_IDS.map((id) => CAMERA_VIEWS[id].region)).toEqual([
      'saw',
      'cylinder',
      'carb',
      'clutch',
      'bar',
      'kickback',
    ]);
  });

  it('looks from the bar side, above the floor', () => {
    CAMERA_VIEW_IDS.forEach((id) =>
      STAGE_VARIANTS.forEach((variant) => {
        const [, y, z] = CAMERA_VIEWS[id].direction[variant];
        expect(z, id).toBeGreaterThan(0);
        expect(y, id).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it('frames the cylinder wider on a desktop', () => {
    expect(framedViews('phone').cylinderCut.margin).toBe(1.15);
    expect(framedViews('desktop').cylinderCut.margin).toBe(1.3);
    expect(framedViews('phone').barChain.direction).toEqual([0.05, 1.5, 1]);
    CAMERA_VIEW_IDS.forEach((id) => expect(framedViews('desktop')[id].follow, id).toBeUndefined());
  });

  it('frames the whole saw closer on a phone so the bar nose stays in', () => {
    expect(framedViews('phone').sawSide.margin).toBeLessThan(framedViews('desktop').sawSide.margin);
  });

  it('picks the phone framing below 600 pixels of stage width', () => {
    expect(stageVariant(599)).toBe('phone');
    expect(stageVariant(600)).toBe('desktop');
  });
});
