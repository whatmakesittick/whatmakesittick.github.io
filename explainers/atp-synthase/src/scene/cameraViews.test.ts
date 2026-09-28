import { describe, expect, it } from 'vitest';
import { PRESETS } from '../state';
import { CAMERA_VIEWS, CLOSE_DISTANCE, WIDE_DISTANCE } from './cameraViews';

function direction(id: keyof typeof CAMERA_VIEWS): readonly number[] {
  return CAMERA_VIEWS[id].direction as readonly number[];
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

  it('looks from the front and from above the membrane', () => {
    (['motor', 'pumps', 'ring', 'head', 'row'] as const).forEach((id) => {
      expect(direction(id)[1], id).toBeGreaterThan(0);
      expect(direction(id)[2], id).toBeGreaterThan(0);
    });
  });

  it('looks down onto the head and along the row from the side', () => {
    expect(direction('head')[1]).toBeGreaterThan(direction('motor')[1]);
    expect(direction('row')[0]).toBeGreaterThan(direction('row')[2]);
  });

  it('leaves some room around each region', () => {
    Object.entries(CAMERA_VIEWS).forEach(([id, view]) =>
      expect(view.margin, id).toBeGreaterThan(1),
    );
  });
});
