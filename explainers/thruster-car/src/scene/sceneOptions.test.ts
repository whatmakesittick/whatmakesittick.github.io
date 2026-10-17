import { describe, expect, it } from 'vitest';
import { SITE, SITE_REGIONS } from '../model/layout';
import { THEME } from '../theme';
import { SCENE_OPTIONS } from './sceneOptions';

const SITE_LENGTH = SITE_REGIONS.site.x[1] - SITE_REGIONS.site.x[0];
const CLOSE_UP_METRES = 1.2;

describe('scene options', () => {
  it('turns the stage off and fogs the site in the dusk haze', () => {
    expect(SCENE_OPTIONS.stage).toBe(false);
    expect(SCENE_OPTIONS.background).toBe(THEME.fog);
    expect(SCENE_OPTIONS.fog?.color).toBe(SCENE_OPTIONS.background);
    expect(SCENE_OPTIONS.fog?.near).toBe(SITE.fogNear);
    expect(SCENE_OPTIONS.fog?.far).toBeGreaterThan(SITE.groundSize / 2);
    expect(SCENE_OPTIONS.gaugeSide).toBe('right');
  });

  it('reaches from a close look at the tank to the whole site', () => {
    const camera = SCENE_OPTIONS.camera ?? {};
    expect(camera.near).toBeLessThan(CLOSE_UP_METRES / 10);
    expect(camera.far).toBeGreaterThan(SCENE_OPTIONS.fog?.far ?? Infinity);
    expect(camera.distance?.min).toBeLessThanOrEqual(CLOSE_UP_METRES);
    expect(camera.distance?.max).toBeGreaterThan(2 * SITE_LENGTH);
    expect(camera.floorMargin).toBeLessThan(1);
  });

  it('lets the camera dip just below level to look up at the flip', () => {
    const angle = SCENE_OPTIONS.camera?.maxPolarAngle ?? 0;
    expect(angle).toBeGreaterThan(Math.PI / 2);
    expect(angle).toBeLessThan(Math.PI * 0.6);
  });

  it('dims lightly and never dims the runway and the landing box', () => {
    expect(SCENE_OPTIONS.highlight?.undimmed).toEqual(['runway', 'landingPad']);
    expect(SCENE_OPTIONS.highlight?.dim?.brightness).toBeGreaterThan(0.6);
  });
});
