import { describe, expect, it } from 'vitest';
import { toDegrees, toRadians, wrapAngle } from '@core/math';
import { STATOR_AZIMUTH_DEG } from '../model';
import { PRESETS } from '../state';
import { CAMERA_VIEWS, CLOSE_DISTANCE, WIDE_DISTANCE } from './cameraViews';

type ViewId = keyof typeof CAMERA_VIEWS;

const SIDE_ON_DEG = 90;
const SIDE_ON_TOLERANCE_DEG = 15;
const HEAD_TILT_LIMIT_DEG = 15;

function direction(id: ViewId): readonly number[] {
  return CAMERA_VIEWS[id].direction as readonly number[];
}

function azimuthDeg(id: ViewId): number {
  const [x, , z] = direction(id);
  return toDegrees(Math.atan2(-z, x));
}

function elevationDeg(id: ViewId): number {
  const [x, y, z] = direction(id);
  return toDegrees(Math.atan2(y, Math.hypot(x, z)));
}

describe('camera views', () => {
  it('offers every view the chapters ask for', () => {
    Object.values(PRESETS).forEach((preset) => expect(CAMERA_VIEWS[preset.camera]).toBeDefined());
  });

  it('frames the regions the assembly offers', () => {
    expect(CAMERA_VIEWS.motor.region).toBe('motor');
    expect(CAMERA_VIEWS.pumps.region).toBe('pumps');
    expect(CAMERA_VIEWS.ring.region).toBe('rotor');
    expect(CAMERA_VIEWS.head.region).toBe('head');
    expect(CAMERA_VIEWS.row.region).toBe('row');
  });

  it('lets the whole motor and the row zoom out further than the close views', () => {
    expect(CAMERA_VIEWS.motor.distance).toEqual({ min: 60, max: 3200 });
    expect(CAMERA_VIEWS.row.distance).toBe(WIDE_DISTANCE);
    (['pumps', 'ring', 'head'] as const).forEach((id) =>
      expect(CAMERA_VIEWS[id].distance, id).toEqual(CLOSE_DISTANCE),
    );
    expect(CLOSE_DISTANCE).toEqual({ min: 30, max: 1600 });
  });

  it('looks at every region from the front', () => {
    (['motor', 'pumps', 'ring', 'head', 'row'] as const).forEach((id) =>
      expect(direction(id)[2], id).toBeGreaterThan(0),
    );
  });

  it('looks down on the membrane in every view but the head', () => {
    (['motor', 'pumps', 'ring', 'row'] as const).forEach((id) =>
      expect(direction(id)[1], id).toBeGreaterThan(0),
    );
  });

  it('looks up at the head a little so it stands against the dark background', () => {
    expect(elevationDeg('head')).toBeLessThan(0);
    expect(elevationDeg('head')).toBeGreaterThan(-HEAD_TILT_LIMIT_DEG);
  });

  it('shows the side arm beside the head in the whole-motor view', () => {
    const apart = Math.abs(
      toDegrees(wrapAngle(toRadians(STATOR_AZIMUTH_DEG - azimuthDeg('motor')))),
    );
    expect(Math.abs(apart - SIDE_ON_DEG)).toBeLessThan(SIDE_ON_TOLERANCE_DEG);
  });

  it('looks along the pumps toward the motor and along the row from its near end', () => {
    expect(direction('pumps')[0]).toBeLessThan(0);
    expect(direction('row')[0]).toBeGreaterThan(0);
    expect(direction('row')[2]).toBeGreaterThan(direction('row')[0]);
  });

  it('leaves some room around each region', () => {
    Object.entries(CAMERA_VIEWS).forEach(([id, view]) =>
      expect(view.margin, id).toBeGreaterThan(1),
    );
  });
});
