import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS } from '../ids';
import { Box3, Vector3 } from 'three';
import {
  CAMERA_VIEWS,
  STAGE_VARIANTS,
  FRAME_LIFT,
  frameLift,
  framedRegion,
  framedViews,
  liftedPose,
  stageVariant,
} from './cameraViews';

describe('camera views', () => {
  it('offers the seven fixed views on their regions', () => {
    expect(Object.keys(CAMERA_VIEWS)).toEqual([...CAMERA_VIEW_IDS]);
    expect(CAMERA_VIEW_IDS.map((id) => CAMERA_VIEWS[id].region)).toEqual([
      'saw',
      'cylinder',
      'carb',
      'starter',
      'clutch',
      'bar',
      'kickback',
    ]);
  });

  it('looks from the bar side, above the floor, except on the starter side', () => {
    CAMERA_VIEW_IDS.forEach((id) =>
      STAGE_VARIANTS.forEach((variant) => {
        const [, y, z] = CAMERA_VIEWS[id].direction[variant];
        expect(z, id)[id === 'starterSide' ? 'toBeLessThan' : 'toBeGreaterThan'](0);
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

  it('frames the kickback closer on a phone so the saw spans the stage', () => {
    expect(framedViews('phone').kickbackWide.margin).toBeLessThan(
      framedViews('desktop').kickbackWide.margin,
    );
  });

  it('frames the starter lower on a desktop so the pulled grip rises past the gauge band', () => {
    const box = new Box3(new Vector3(-1, 0, -1), new Vector3(1, 1, 1));
    const desktop = framedRegion(box, 'starter', 'desktop');
    expect(desktop?.min.y).toBeLessThan(0);
    expect(desktop?.max).toEqual(box.max);
    expect(box.min.y).toBe(0);
    expect(framedRegion(box, 'starter', 'phone')).toBe(box);
    expect(framedRegion(box, 'saw', 'desktop')).toBe(box);
    expect(framedRegion(null, 'starter', 'desktop')).toBeNull();
  });

  it('lowers the camera and its target together so the subject sits higher in the frame', () => {
    const pose = { position: new Vector3(0, 0, 10), target: new Vector3(0, 0, 0) };
    const slopes = { vertical: 0.5, horizontal: 0.5 };
    const lifted = liftedPose(pose, slopes, 0.2);
    expect(lifted.target.y).toBeCloseTo(-1);
    expect(lifted.position.y).toBeCloseTo(-1);
    expect(lifted.position.z).toBeCloseTo(10);
    expect(pose.target.y).toBe(0);
    STAGE_VARIANTS.forEach((variant) => expect(FRAME_LIFT[variant]).toBeGreaterThan(0));
  });

  it('keeps the whole-saw view unlifted on a phone and lifts every other view', () => {
    expect(frameLift('sawSide', 'phone')).toBe(0);
    expect(frameLift('sawSide', 'desktop')).toBe(FRAME_LIFT.desktop);
    expect(frameLift('cylinderCut', 'phone')).toBe(FRAME_LIFT.phone);
  });

  it('picks the phone framing below 600 pixels of stage width', () => {
    expect(stageVariant(599)).toBe('phone');
    expect(stageVariant(600)).toBe('desktop');
  });
});
