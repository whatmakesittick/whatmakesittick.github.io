import { Vector3 } from 'three';
import type { Box3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { Direction } from '@core/scene/cameraViews';
import { frameBox } from '@core/scene/frameBox';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import { regionFromSpec } from '@core/scene/regions';
import { CAMERA_VIEW_IDS, REGISTER_IDS } from '../ids';
import type { CameraView, Point, RegionId, RegisterId } from '../ids';
import { NOTES, lidTip, regionSpecFor } from '../model';
import type { RegionOptions } from '../model';
import { PRESETS } from '../state';
import { CAMERA_VIEWS } from './cameraViews';

const PHONE: FramingSlopes = { vertical: 0.2, horizontal: 0.13 };
const DESKTOP: FramingSlopes = { vertical: 0.27, horizontal: 0.45 };
const STAGES: readonly FramingSlopes[] = [PHONE, DESKTOP];
const WORLD_UP = new Vector3(0, 1, 0);
const FLOOR_Y = 0;
const SIDE_ELEVATION_LIMIT = 0.3;
const SIDE_VIEWS: readonly CameraView[] = ['action', 'escapement', 'soundboard', 'lineUp'];
const THREE_QUARTER_VIEWS: readonly CameraView[] = ['grand', 'dampers'];
const PLAIN: RegionOptions = { ghost: false, inset: false };
const OPTION_SETS: readonly RegionOptions[] = [false, true].flatMap((ghost) =>
  [false, true].map((inset) => ({ ghost, inset })),
);

const VIEW_REGIONS: Readonly<Record<CameraView, RegionId>> = {
  grand: 'grand',
  action: 'action',
  escapement: 'escapement',
  dampers: 'dampers',
  soundboard: 'string',
  lineUp: 'lineUp',
};

function directionOf(view: CameraView): Direction {
  return CAMERA_VIEWS[view].direction as Direction;
}

function regionBox(view: CameraView, register: RegisterId, options: RegionOptions): Box3 {
  return regionFromSpec(regionSpecFor(CAMERA_VIEWS[view].region, NOTES[register].key, options));
}

function viewPose(view: CameraView, box: Box3, slopes: FramingSlopes): CameraPose {
  const facing = new Vector3(...directionOf(view)).normalize();
  return frameBox(box, facing, slopes, CAMERA_VIEWS[view].margin);
}

function viewOffset({ position, target }: CameraPose, point: Vector3): Vector3 {
  const forward = target.clone().sub(position).normalize();
  const right = new Vector3().crossVectors(forward, WORLD_UP).normalize();
  const up = new Vector3().crossVectors(right, forward);
  const toPoint = point.clone().sub(position);
  return new Vector3(toPoint.dot(right), toPoint.dot(up), toPoint.dot(forward));
}

function inFrame(pose: CameraPose, point: Point, slopes: FramingSlopes): boolean {
  const { x, y, z } = viewOffset(pose, new Vector3(...point));
  return z > 0 && Math.abs(x / z) <= slopes.horizontal && Math.abs(y / z) <= slopes.vertical;
}

function boxCorners({ min, max }: Box3): Point[] {
  return [min.x, max.x].flatMap((x) =>
    [min.y, max.y].flatMap((y) => [min.z, max.z].map((z): Point => [x, y, z])),
  );
}

function everyFraming(check: (view: CameraView, box: Box3, slopes: FramingSlopes) => void) {
  CAMERA_VIEW_IDS.forEach((view) =>
    REGISTER_IDS.forEach((register) =>
      OPTION_SETS.forEach((options) =>
        STAGES.forEach((slopes) => check(view, regionBox(view, register, options), slopes)),
      ),
    ),
  );
}

describe('piano camera views', () => {
  it('offers every camera view, including each one the chapters ask for', () => {
    expect(Object.keys(CAMERA_VIEWS).sort()).toEqual([...CAMERA_VIEW_IDS].sort());
    Object.values(PRESETS).forEach((preset) => expect(CAMERA_VIEWS[preset.camera]).toBeDefined());
  });

  it('keeps every view fixed, since following is the reader toggle', () => {
    CAMERA_VIEW_IDS.forEach((view) => expect(CAMERA_VIEWS[view].follow, view).toBeUndefined());
  });

  it('frames each view on its region', () => {
    CAMERA_VIEW_IDS.forEach((view) =>
      expect(CAMERA_VIEWS[view].region, view).toBe(VIEW_REGIONS[view]),
    );
  });

  it('looks at the side views square from the bass side, a little above', () => {
    SIDE_VIEWS.forEach((view) => {
      const [across, up, along] = directionOf(view);
      expect(along, view).toBe(0);
      expect(across, view).toBeLessThan(0);
      expect(up, view).toBeGreaterThan(0);
      expect(up, view).toBeLessThan(Math.abs(across) * SIDE_ELEVATION_LIMIT);
    });
  });

  it('looks at the three-quarter views from the front left and above, the dampers higher', () => {
    THREE_QUARTER_VIEWS.forEach((view) => {
      const [across, up, along] = directionOf(view);
      expect(across, view).toBeLessThan(0);
      expect(up, view).toBeGreaterThan(0);
      expect(along, view).toBeGreaterThan(0);
    });
    const elevation = (view: CameraView) => {
      const [across, up, along] = directionOf(view);
      return up / Math.hypot(across, along);
    };
    expect(elevation('dampers')).toBeGreaterThan(elevation('grand'));
  });

  it('keeps each whole region in frame on a phone and a desktop in every register', () => {
    everyFraming((view, box, slopes) => {
      const pose = viewPose(view, box, slopes);
      boxCorners(box).forEach((point) =>
        expect(inFrame(pose, point, slopes), `${view} ${point.join(', ')}`).toBe(true),
      );
    });
  });

  it('keeps every camera above the floor and the grand view above the open lid', () => {
    everyFraming((view, box, slopes) =>
      expect(viewPose(view, box, slopes).position.y, view).toBeGreaterThan(FLOOR_Y),
    );
    STAGES.forEach((slopes) => {
      const pose = viewPose('grand', regionBox('grand', 'middle', PLAIN), slopes);
      expect(pose.position.y).toBeGreaterThan(lidTip()[1]);
    });
  });
});
