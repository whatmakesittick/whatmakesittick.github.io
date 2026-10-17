import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CameraViews } from '@core/scene/cameraViews';
import type { ViewRig } from '@core/scene/cameraViews';
import type { CameraPose } from '@core/scene/frameBox';
import { NO_SAFE_AREA, framingSlopes } from '@core/scene/lens';
import type { ViewportSize } from '@core/scene/lens';
import { regionFromSpec } from '@core/scene/regions';
import { CAR_REGION_IDS } from '../ids';
import type { CameraView, RegionId, SiteRegionId } from '../ids';
import { SITE, SITE_REGIONS } from '../model';
import { THEME } from '../theme';
import { FIXED_VIEWS, cameraViews } from './cameraViews';
import type { FixedView } from './cameraViews';
import { UNDIMMED_PARTS } from './partInfo';
import { SCENE_OPTIONS } from './sceneOptions';

const PHONE_PORTRAIT: ViewportSize = { width: 390, height: 844, safe: NO_SAFE_AREA };
const DESKTOP_STAGE: ViewportSize = { width: 835, height: 900, safe: NO_SAFE_AREA };
const STAGES: readonly ViewportSize[] = [PHONE_PORTRAIT, DESKTOP_STAGE];
const FIXED_IDS = Object.keys(FIXED_VIEWS) as FixedView[];

interface Framing {
  distance: number;
  halfDepth: number;
}

function isSiteRegion(id: RegionId): id is SiteRegionId {
  return !(CAR_REGION_IDS as readonly RegionId[]).includes(id);
}

function regionBox(id: RegionId) {
  return isSiteRegion(id) ? regionFromSpec(SITE_REGIONS[id]) : null;
}

function rigFor(stage: ViewportSize): ViewRig {
  const ignore = () => {};
  return {
    framing: () => framingSlopes(stage),
    follow: ignore,
    setDistanceLimits: ignore,
    jumpTo: ignore,
    tweenTo: ignore,
  };
}

function framedPose(view: FixedView, stage: ViewportSize): CameraPose {
  const views = new CameraViews<CameraView, RegionId>(rigFor(stage), {
    views: cameraViews(() => null),
    region: regionBox,
  });
  const pose = views.pose(view);
  if (!pose) throw new Error(`No pose for ${view}`);
  return pose;
}

function halfDepth(view: FixedView, { position, target }: CameraPose): number {
  const box = regionBox(FIXED_VIEWS[view].region);
  if (!box) throw new Error(`No region for ${view}`);
  const forward = target.clone().sub(position).normalize();
  const corners = [box.min, box.max].flatMap(({ x }) =>
    [box.min.y, box.max.y].flatMap((y) => [box.min.z, box.max.z].map((z) => new Vector3(x, y, z))),
  );
  return Math.max(...corners.map((corner) => corner.sub(target).dot(forward)));
}

function framing(view: FixedView, stage: ViewportSize): Framing {
  const pose = framedPose(view, stage);
  return { distance: pose.position.distanceTo(pose.target), halfDepth: halfDepth(view, pose) };
}

function farthestFraming(): Framing {
  const all = FIXED_IDS.flatMap((view) => STAGES.map((stage) => framing(view, stage)));
  return all.reduce((far, next) =>
    next.distance + next.halfDepth > far.distance + far.halfDepth ? next : far,
  );
}

describe('scene options', () => {
  it('fogs the site in the dusk colour behind a dusk sky, with no stage disc', () => {
    expect(SCENE_OPTIONS.stage).toBe(false);
    expect(SCENE_OPTIONS.background).toBe(THEME.skyMiddle);
    expect(SCENE_OPTIONS.fog?.color).toBe(THEME.fog);
    expect(SCENE_OPTIONS.fog?.near).toBe(SITE.fogNear);
    expect(SCENE_OPTIONS.gaugeSide).toBe('right');
    expect(SCENE_OPTIONS.highlight?.undimmed).toEqual(UNDIMMED_PARTS);
  });

  it('frames the whole site farthest away on a phone held upright', () => {
    const phone = framing('siteWide', PHONE_PORTRAIT);
    expect(phone.distance).toBeGreaterThan(framing('siteWide', DESKTOP_STAGE).distance);
    expect(farthestFraming()).toEqual(phone);
  });

  it('lets the camera back off past the widest framing and still see the site through the fog', () => {
    const { distance, halfDepth: depth } = farthestFraming();
    const camera = SCENE_OPTIONS.camera ?? {};
    const fogFar = SCENE_OPTIONS.fog?.far ?? 0;
    expect(camera.distance?.max).toBeGreaterThan(distance);
    expect(fogFar).toBeGreaterThan(distance + depth);
    expect(camera.far).toBeGreaterThan(fogFar);
  });
});
