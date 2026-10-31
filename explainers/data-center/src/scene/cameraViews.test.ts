import type { Box3 } from 'three';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { CustomView } from '@core/scene/cameraViews';
import { frameBox } from '@core/scene/frameBox';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import { regionFromSpec } from '@core/scene/regions';
import { CAMERA_VIEW_IDS } from '../ids';
import type { CameraView, ChaseTarget, Point } from '../ids';
import {
  BUILDING,
  CEILING_Y,
  CHASE_SPAN,
  MOMENTS,
  ROOF_Y,
  ROOM_WALL_X,
  ROWS,
  SUBJECT_RACK,
  WALL_THICKNESS,
  jouleAt,
} from '../model';
import { PRESETS } from '../state';
import {
  CHASE,
  CHASE_VIEW,
  COMPASS_VIEWS,
  FIXED_VIEWS,
  FOLLOW_MODE,
  cameraViews,
  chasePose,
  compass,
} from './cameraViews';
import type { FixedView } from './cameraViews';
import { SCENE_OPTIONS } from './index';
import { framedRegionSpec } from './regions';

const PHONE: FramingSlopes = { vertical: 0.223, horizontal: 0.259 };
const DESKTOP: FramingSlopes = { vertical: 0.27, horizontal: 0.45 };
const STAGES: readonly FramingSlopes[] = [PHONE, DESKTOP];
const WORLD_UP = new Vector3(0, 1, 0);
const DIGITS = 9;
const EDGE_TOLERANCE = 1e-9;
const GROUND_Y = 0;
const FIXED_IDS = Object.keys(FIXED_VIEWS) as FixedView[];
const ALONG_ROW_COSINE = Math.cos(Math.PI / 8);
const HALL_INSIDE_X = ROOM_WALL_X + WALL_THICKNESS / 2;
const ROWS_START_X = Math.min(...ROWS.map((row) => row.startX));
const OUTDOOR = jouleAt(0, 'liquid');
const IN_RACK = jouleAt(MOMENTS.atRack, 'liquid');

function chaseOf({ position, heading, span }: typeof OUTDOOR): ChaseTarget {
  return { position, heading, pitch: 0, roll: 0, span };
}

const OUTDOOR_CHASE = chaseOf(OUTDOOR);
const RACK_CHASE = chaseOf(IN_RACK);

function corners(box: Box3): Point[] {
  const { min, max } = box;
  return [min.x, max.x].flatMap((x) =>
    [min.y, max.y].flatMap((y) => [min.z, max.z].map((z): Point => [x, y, z])),
  );
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
  return (
    z > 0 &&
    Math.abs(x / z) <= slopes.horizontal + EDGE_TOLERANCE &&
    Math.abs(y / z) <= slopes.vertical + EDGE_TOLERANCE
  );
}

function screenRight({ position, target }: CameraPose): Vector3 {
  const forward = target.clone().sub(position).normalize();
  return new Vector3().crossVectors(forward, WORLD_UP).normalize();
}

function regionBox(id: FixedView): Box3 {
  return regionFromSpec(framedRegionSpec(FIXED_VIEWS[id].region));
}

function fixedPose(id: FixedView, slopes: FramingSlopes): CameraPose {
  const { direction, margin } = FIXED_VIEWS[id];
  const facing = new Vector3(...(direction as readonly [number, number, number])).normalize();
  return frameBox(regionBox(id), facing, slopes, margin);
}

function viewPose(id: CameraView, slopes: FramingSlopes): CameraPose | null {
  if (id === CHASE_VIEW) return chasePose(OUTDOOR_CHASE, CHASE, slopes);
  return fixedPose(id, slopes);
}

function rounded(vector: Vector3): number[] {
  return vector.toArray().map((value) => Number(value.toFixed(DIGITS)));
}

describe('data centre camera views', () => {
  const views = cameraViews(() => OUTDOOR_CHASE);

  it('offers every camera view, including each one the chapters ask for', () => {
    expect(Object.keys(views).sort()).toEqual([...CAMERA_VIEW_IDS].sort());
    Object.values(PRESETS).forEach((preset) => expect(views[preset.camera]).toBeDefined());
  });

  it('follows the joule by position in the chase and holds still in the fixed views', () => {
    expect(views.chase.follow).toBe(FOLLOW_MODE);
    expect(FOLLOW_MODE).toBe('position');
    FIXED_IDS.forEach((id) => expect(views[id].follow, id).toBeUndefined());
  });

  it('frames each fixed view on the region the spec names, the campus with its incoming line', () => {
    expect(Object.fromEntries(FIXED_IDS.map((id) => [id, FIXED_VIEWS[id].region]))).toEqual({
      campus: 'campusAndLine',
      powerYard: 'yardAndRoom',
      rackSide: 'rack',
      networkRow: 'networkRow',
      coolingPlant: 'coolingLoop',
      lineUp: 'lineUp',
    });
  });

  it('turns a compass bearing into a direction toward the camera', () => {
    const [southX, , southZ] = compass(180, 0);
    expect(southX).toBeCloseTo(0, DIGITS);
    expect(southZ).toBeCloseTo(1, DIGITS);
    const [westX, westUp, westZ] = compass(270, 30);
    expect(westX).toBeLessThan(0);
    expect(westUp).toBeCloseTo(0.5, DIGITS);
    expect(westZ).toBeCloseTo(0, DIGITS);
  });

  it('keeps each fixed view on its whole region on a phone and a desktop', () => {
    STAGES.forEach((slopes) =>
      FIXED_IDS.forEach((id) => {
        const pose = fixedPose(id, slopes);
        corners(regionBox(id)).forEach((point) =>
          expect(inFrame(pose, point, slopes), `${id} ${point.join(', ')}`).toBe(true),
        );
      }),
    );
  });

  it('shows the joule where it starts on the grid line in the campus view', () => {
    STAGES.forEach((slopes) =>
      expect(inFrame(fixedPose('campus', slopes), OUTDOOR.position, slopes)).toBe(true),
    );
  });

  it('looks at the campus from high in the south-west, the power yard lower', () => {
    STAGES.forEach((slopes) => {
      const campus = fixedPose('campus', slopes);
      const yard = fixedPose('powerYard', slopes);
      [campus, yard].forEach(({ position, target }) => {
        expect(position.x).toBeLessThan(target.x);
        expect(position.z).toBeGreaterThan(target.z);
        expect(position.y).toBeGreaterThan(ROOF_Y);
      });
      expect(COMPASS_VIEWS.powerYard.elevation).toBeLessThan(COMPASS_VIEWS.campus.elevation);
    });
  });

  it('runs the power path from left to right in every view that looks north', () => {
    const lookingNorth: readonly FixedView[] = [
      'campus',
      'powerYard',
      'rackSide',
      'coolingPlant',
      'lineUp',
    ];
    STAGES.forEach((slopes) =>
      lookingNorth.forEach((id) =>
        expect(screenRight(fixedPose(id, slopes)).x, id).toBeGreaterThan(0),
      ),
    );
  });

  it('stands in the hall at about eye height for the rack and the line-up', () => {
    STAGES.forEach((slopes) =>
      (['rackSide', 'lineUp'] as const).forEach((id) => {
        const { position } = fixedPose(id, slopes);
        expect(position.x, id).toBeGreaterThan(HALL_INSIDE_X);
        expect(position.x, id).toBeLessThan(ROWS_START_X);
        expect(position.z, id).toBeLessThan(BUILDING.z[1]);
        expect(position.y, id).toBeLessThan(CEILING_Y);
      }),
    );
  });

  it('looks west along the subject row from above the hall', () => {
    STAGES.forEach((slopes) => {
      const { position, target } = fixedPose('networkRow', slopes);
      expect(position.x).toBeGreaterThan(target.x);
      expect(position.y).toBeGreaterThan(ROOF_Y);
      const toRack = new Vector3(...SUBJECT_RACK).sub(position).setY(0).normalize();
      expect(toRack.x).toBeLessThan(-ALONG_ROW_COSINE);
    });
  });

  it('watches the cooling plant from the south-south-east above the roof', () => {
    STAGES.forEach((slopes) => {
      const { position, target } = fixedPose('coolingPlant', slopes);
      expect(position.x).toBeGreaterThan(target.x);
      expect(position.z - target.z).toBeGreaterThan(position.x - target.x);
      expect(position.y).toBeGreaterThan(ROOF_Y);
    });
  });

  it('leaves the camera alone until the joule exists', () => {
    expect((cameraViews(() => null).chase as CustomView).pose(PHONE)).toBeNull();
  });

  it('moves the chase pose with the joule', () => {
    let chase = OUTDOOR_CHASE;
    const tracking = cameraViews(() => chase).chase as CustomView;
    const before = tracking.pose(PHONE);
    const moved: Point = [OUTDOOR.position[0] + 3, OUTDOOR.position[1], OUTDOOR.position[2] - 2];
    chase = { ...OUTDOOR_CHASE, position: moved };
    const after = tracking.pose(PHONE);
    expect(before && after).toBeTruthy();
    if (!before || !after) return;
    const shift = new Vector3(3, 0, -2);
    expect(rounded(after.target.clone().sub(before.target))).toEqual(rounded(shift));
    expect(rounded(after.position.clone().sub(before.position))).toEqual(rounded(shift));
  });

  it('chases from behind and above the joule, centred on it', () => {
    [OUTDOOR_CHASE, RACK_CHASE].forEach((chase) => {
      const { position, target } = chasePose(chase, CHASE, PHONE);
      expect(target.toArray()).toEqual([...chase.position]);
      const ahead = new Vector3(Math.cos(chase.heading), 0, -Math.sin(chase.heading));
      expect(position.clone().sub(target).dot(ahead)).toBeLessThan(0);
      expect(position.y).toBeGreaterThan(target.y);
    });
  });

  it('chases close inside the rack and wider outdoors', () => {
    expect(RACK_CHASE.span).toBe(CHASE_SPAN.compute);
    expect(OUTDOOR_CHASE.span).toBe(CHASE_SPAN.grid);
    STAGES.forEach((slopes) => {
      const outdoor = chasePose(OUTDOOR_CHASE, CHASE, slopes);
      const inRack = chasePose(RACK_CHASE, CHASE, slopes);
      expect(inRack.position.distanceTo(inRack.target)).toBeLessThan(
        outdoor.position.distanceTo(outdoor.target),
      );
    });
  });

  it('keeps every camera above the ground and inside the distance limits', () => {
    const { min = 0, max = Infinity } = SCENE_OPTIONS.camera?.distance ?? {};
    STAGES.forEach((slopes) =>
      CAMERA_VIEW_IDS.forEach((id) => {
        const pose = viewPose(id, slopes);
        expect(pose, id).not.toBeNull();
        if (!pose) return;
        const distance = pose.position.distanceTo(pose.target);
        expect(pose.position.y, id).toBeGreaterThan(GROUND_Y);
        expect(distance, id).toBeGreaterThanOrEqual(min);
        expect(distance, id).toBeLessThanOrEqual(max);
      }),
    );
    [RACK_CHASE].forEach((chase) =>
      STAGES.forEach((slopes) => {
        const pose = chasePose(chase, CHASE, slopes);
        expect(pose.position.distanceTo(pose.target)).toBeGreaterThanOrEqual(min);
      }),
    );
  });
});
