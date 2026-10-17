import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { Direction } from '@core/scene/cameraViews';
import { frameBox } from '@core/scene/frameBox';
import { framingSlopes } from '@core/scene/lens';
import type { ViewportSize } from '@core/scene/lens';
import { regionFromSpec } from '@core/scene/regions';
import { SITE, SITE_REGIONS } from '../model/layout';
import { THEME } from '../theme';
import { FIXED_VIEWS } from './cameraViews';
import { GROUND } from './geometry/site/groundGrid';
import { SCENE_OPTIONS } from './sceneOptions';

const CLOSE_UP_METRES = 1.2;
const PHONE_HAZE = 0.3;
const DESKTOP_HAZE = 0.4;
const STAGES = {
  phone: { width: 390, height: 421, safe: { top: 0, right: 10, bottom: 94, left: 0 } },
  desktop: { width: 834, height: 900, safe: { top: 0, right: 227, bottom: 145, left: 0 } },
  expandedPhone: { width: 390, height: 844, safe: { top: 0, right: 10, bottom: 94, left: 0 } },
} as const satisfies Record<string, ViewportSize>;

const fog = SCENE_OPTIONS.fog ?? { color: '', near: 0, far: 0 };
const camera = SCENE_OPTIONS.camera ?? {};

function siteWideDistance(stage: ViewportSize): number {
  const { direction, margin } = FIXED_VIEWS.siteWide;
  const pose = frameBox(
    regionFromSpec(SITE_REGIONS.site),
    new Vector3(...(direction as Direction)).normalize(),
    framingSlopes(stage),
    margin,
  );
  return pose.position.distanceTo(pose.target);
}

function haze(distance: number): number {
  return (distance - fog.near) / (fog.far - fog.near);
}

function groundEdgeGap(): number {
  const half = SITE.groundSize / 2 + Math.max(...GROUND.skirt);
  const alongX = Math.max(...SITE.run.x.map((x) => Math.abs(x - GROUND.centreX)));
  const acrossZ = Math.max(...SITE.run.z.map(Math.abs));
  return half - Math.max(alongX, acrossZ);
}

describe('scene options', () => {
  it('turns the stage off and fogs the site in the dusk haze', () => {
    expect(SCENE_OPTIONS.stage).toBe(false);
    expect(SCENE_OPTIONS.background).toBe(THEME.fog);
    expect(fog.color).toBe(SCENE_OPTIONS.background);
    expect(fog.near).toBe(SITE.fogNear);
    expect(SCENE_OPTIONS.gaugeSide).toBe('right');
  });

  it('frames the whole site within the zoom range on a phone and a desktop', () => {
    expect(FIXED_VIEWS.siteWide.region).toBe('site');
    Object.values(STAGES).forEach((stage) => {
      const distance = siteWideDistance(stage);
      expect(distance).toBeLessThanOrEqual(camera.distance?.max ?? 0);
      expect(distance + SITE.groundSize / 2).toBeLessThan(camera.far ?? 0);
    });
  });

  it('keeps the wide view of the site clear of heavy haze', () => {
    expect(haze(siteWideDistance(STAGES.phone))).toBeLessThan(PHONE_HAZE);
    expect(haze(siteWideDistance(STAGES.desktop))).toBeLessThan(DESKTOP_HAZE);
  });

  it('melts the ground into the fog before the ground or the camera range ends', () => {
    expect(fog.far).toBeLessThanOrEqual(groundEdgeGap());
    expect(camera.far).toBeGreaterThan(fog.far);
  });

  it('reaches a close look at the tank', () => {
    expect(camera.near).toBeLessThan(CLOSE_UP_METRES / 10);
    expect(camera.distance?.min).toBeLessThanOrEqual(CLOSE_UP_METRES);
    expect(camera.floorMargin).toBeLessThan(1);
  });

  it('lets the camera dip just below level to look up at the stunts', () => {
    const angle = camera.maxPolarAngle ?? 0;
    expect(angle).toBeGreaterThan(Math.PI / 2);
    expect(angle).toBeLessThan(Math.PI * 0.6);
  });

  it('dims lightly and never dims the runway and the landing box', () => {
    expect(SCENE_OPTIONS.highlight?.undimmed).toEqual(['runway', 'landingPad']);
    expect(SCENE_OPTIONS.highlight?.dim?.brightness).toBeGreaterThan(0.6);
  });
});
