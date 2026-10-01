import { describe, expect, it } from 'vitest';
import { PRESETS } from '../state';
import { CAMERA_VIEWS } from './cameraViews';

describe('camera views', () => {
  it('offers every view the chapters ask for', () => {
    Object.values(PRESETS).forEach((preset) => expect(CAMERA_VIEWS[preset.camera]).toBeDefined());
  });

  it('frames the regions the spec names', () => {
    expect(
      Object.fromEntries(Object.entries(CAMERA_VIEWS).map(([id, view]) => [id, view.region])),
    ).toEqual({
      hero: 'rifle',
      action: 'receiver',
      cartridge: 'chamber',
      barrel: 'barrel',
      gasSystem: 'gasSystem',
      reload: 'reloadBay',
    });
  });

  it('looks at the right side from a little above, so the muzzle points right', () => {
    Object.values(CAMERA_VIEWS).forEach((view) => {
      const [x, y, z] = view.direction as readonly number[];
      expect(z).toBeGreaterThan(0);
      expect(y).toBeGreaterThan(0);
      expect(Math.abs(x)).toBeLessThan(z);
    });
  });
});
