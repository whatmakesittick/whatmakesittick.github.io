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
  ARM_ANCHOR,
  INSET,
  INSET_CENTRE,
  LIFT_TRAVEL_MM,
  REGION_SPECS,
  SECTION_EXTENTS,
  STATOR_BOTTOM,
  TRAIN,
} from '../model';
import { PRESETS } from '../state';
import {
  FOLLOW_MODE,
  FOLLOW_VIEWS,
  LINE_UP_VIEW,
  REGION_VIEWS,
  WAVE_AIM,
  WHEEL_RAIL_TOP,
  aimPoint,
  cameraViews,
  followPose,
} from './cameraViews';
import type { FixedView, FollowView, RegionView } from './cameraViews';
import { chaseTargetFor } from './pose';

const PHONE: FramingSlopes = { vertical: 0.2, horizontal: 0.13 };
const DESKTOP: FramingSlopes = { vertical: 0.27, horizontal: 0.45 };
const STAGES: readonly FramingSlopes[] = [PHONE, DESKTOP];
const WORLD_UP = new Vector3(0, 1, 0);
const DIGITS = 9;
const FLOATING: ChaseTarget = chaseTargetFor({ liftMm: LIFT_TRAVEL_MM });
const MOVED: ChaseTarget = { ...FLOATING, position: [3, FLOATING.position[1] - 0.02, 0.002] };
const FOLLOW_IDS = Object.keys(FOLLOW_VIEWS) as FollowView[];
const REGION_IDS = Object.keys(REGION_VIEWS) as RegionView[];
const FIXED_IDS: readonly FixedView[] = [...REGION_IDS, 'lineUp'];
const GROUND_Y = 0;
const HALF_WIDTH = TRAIN.width / 2;
const THIRD_SECTION_END = SECTION_EXTENTS[2][0];
const FIFTH_SECTION_FRONT = SECTION_EXTENTS[4][1];

function corners(xs: readonly number[], ys: readonly number[], zs: readonly number[]): Point[] {
  return xs.flatMap((x) => ys.flatMap((y) => zs.map((z): Point => [x, y, z])));
}

const TRAIN_HEIGHTS = [TRAIN.armBottom, TRAIN.roof];
const TRAIN_SIDES = [-HALF_WIDTH, HALF_WIDTH];
const [INSET_X, INSET_Y, INSET_Z] = INSET_CENTRE;

const PHONE_CONTENT: Readonly<Record<FollowView, readonly Point[]>> = {
  ride: corners([THIRD_SECTION_END, TRAIN.noseX], TRAIN_HEIGHTS, TRAIN_SIDES),
  wave: [
    ARM_ANCHOR,
    ...corners(
      [INSET_X - INSET.width / 2, INSET_X + INSET.width / 2],
      [INSET_Y - INSET.height / 2, INSET_Y + INSET.height / 2],
      [INSET_Z],
    ),
  ],
  rear: [
    ...corners([TRAIN.tailX, FIFTH_SECTION_FRONT], TRAIN_HEIGHTS, TRAIN_SIDES),
    [TRAIN.noseX, TRAIN.roof, 0],
  ],
};

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

function offsetOf({ position, target }: CameraPose): Vector3 {
  return position.clone().sub(target);
}

function rounded(vector: Vector3): number[] {
  return vector.toArray().map((value) => Number(value.toFixed(DIGITS)));
}

function poseOf(view: CustomView, slopes: FramingSlopes = PHONE): CameraPose | null {
  return view.pose(slopes);
}

function regionPose(view: RegionView, slopes: FramingSlopes): CameraPose {
  const { region, direction, margin } = REGION_VIEWS[view];
  const facing = new Vector3(...(direction as readonly [number, number, number])).normalize();
  return frameBox(regionFromSpec(REGION_SPECS[region]), facing, slopes, margin);
}

function viewPose(id: CameraView, slopes: FramingSlopes): CameraPose | null {
  if (id in REGION_VIEWS) return regionPose(id as RegionView, slopes);
  return poseOf(cameraViews(() => FLOATING)[id] as CustomView, slopes);
}

function boxCorners(box: Box3): Point[] {
  const { min, max } = box;
  return corners([min.x, max.x], [min.y, max.y], [min.z, max.z]);
}

describe('maglev camera views', () => {
  const views = cameraViews(() => FLOATING);

  it('offers every camera view, including each one the chapters ask for', () => {
    expect(Object.keys(views).sort()).toEqual([...CAMERA_VIEW_IDS].sort());
    Object.values(PRESETS).forEach((preset) => expect(views[preset.camera]).toBeDefined());
  });

  it('rides along with the train in the fly-along views and stays put in the fixed ones', () => {
    FOLLOW_IDS.forEach((id) => expect(views[id].follow, id).toBe(FOLLOW_MODE));
    expect(FOLLOW_MODE).toBe('position');
    FIXED_IDS.forEach((id) => expect(views[id].follow, id).toBeUndefined());
  });

  it('leaves the camera alone until the train exists', () => {
    const empty = cameraViews(() => null);
    FOLLOW_IDS.forEach((id) => expect(poseOf(empty[id] as CustomView), id).toBeNull());
  });

  it('moves every fly-along pose with the chase target', () => {
    let chase = FLOATING;
    const tracking = cameraViews(() => chase);
    const shift = new Vector3(...MOVED.position).sub(new Vector3(...FLOATING.position));
    FOLLOW_IDS.forEach((id) => {
      chase = FLOATING;
      const before = poseOf(tracking[id] as CustomView);
      chase = MOVED;
      const after = poseOf(tracking[id] as CustomView);
      expect(before && after, id).toBeTruthy();
      if (!before || !after) return;
      expect(rounded(after.target.clone().sub(before.target)), id).toEqual(rounded(shift));
      expect(rounded(after.position.clone().sub(before.position)), id).toEqual(rounded(shift));
    });
  });

  it('aims at train points measured on the floating train', () => {
    expect(aimPoint(FLOATING, ARM_ANCHOR).toArray()).toEqual([...ARM_ANCHOR]);
    expect(followPose(FLOATING, FOLLOW_VIEWS.wave).target.toArray()).toEqual([...WAVE_AIM]);
  });

  it('turns the views with the heading', () => {
    const turned = offsetOf(followPose({ ...FLOATING, heading: Math.PI }, FOLLOW_VIEWS.ride));
    const straight = offsetOf(followPose(FLOATING, FOLLOW_VIEWS.ride));
    expect(turned.x).toBeCloseTo(-straight.x, DIGITS);
    expect(turned.z).toBeCloseTo(-straight.z, DIGITS);
  });

  it('rides three-quarter from the front left, a little above the roof', () => {
    const { position } = followPose(FLOATING, FOLLOW_VIEWS.ride);
    expect(position.x).toBeGreaterThan(TRAIN.noseX);
    expect(position.z).toBeLessThan(-HALF_WIDTH);
    expect(position.y).toBeGreaterThan(TRAIN.roof);
  });

  it('watches the wave low from the left, under the guideway edge', () => {
    const { position } = followPose(FLOATING, FOLLOW_VIEWS.wave);
    expect(position.z).toBeLessThan(INSET_Z);
    expect(position.y).toBeLessThan(STATOR_BOTTOM);
  });

  it('follows the stop from behind on the right, above the last section', () => {
    const { position } = followPose(FLOATING, FOLLOW_VIEWS.rear);
    expect(position.x).toBeLessThan(TRAIN.tailX);
    expect(position.z).toBeGreaterThan(0);
    expect(position.y).toBeGreaterThan(TRAIN.roof);
  });

  it('keeps what each fly-along view is about in frame on a phone and a desktop', () => {
    FOLLOW_IDS.forEach((id) => {
      const pose = followPose(FLOATING, FOLLOW_VIEWS[id]);
      STAGES.forEach((slopes) =>
        PHONE_CONTENT[id].forEach((point) =>
          expect(inFrame(pose, point, slopes), `${id} ${point.join(', ')}`).toBe(true),
        ),
      );
    });
  });

  it('frames the arm from the left and below, the cut and the line-up from ahead', () => {
    expect(REGION_VIEWS.arm.region).toBe('arm');
    expect(REGION_VIEWS.section.region).toBe('crossSection');
    const [, armUp, armSide] = REGION_VIEWS.arm.direction as readonly number[];
    expect(armSide).toBeLessThan(0);
    expect(armUp).toBeLessThan(0);
    const [sectionAhead, sectionUp, sectionSide] = REGION_VIEWS.section
      .direction as readonly number[];
    expect(sectionAhead).toBeGreaterThan(0);
    expect(sectionUp).toBeGreaterThan(0);
    expect(sectionSide).toBeLessThan(0);
    const [lineUpAhead, lineUpUp, lineUpSide] = LINE_UP_VIEW.direction;
    expect(lineUpAhead).toBeGreaterThan(0);
    expect(lineUpUp).toBeGreaterThan(0);
    expect(lineUpSide).toBe(0);
  });

  it('frames the line-up tall enough for the wheel-rail roof and pantograph', () => {
    const { box } = LINE_UP_VIEW;
    expect(box.y[1]).toBe(WHEEL_RAIL_TOP);
    expect(WHEEL_RAIL_TOP).toBeGreaterThan(REGION_SPECS.lineUp.y[1]);
    expect(box.x).toEqual(REGION_SPECS.lineUp.x);
    expect(box.z).toEqual(REGION_SPECS.lineUp.z);
  });

  it('keeps each fixed view on its whole subject on a phone and a desktop', () => {
    STAGES.forEach((slopes) => {
      REGION_IDS.forEach((id) => {
        const pose = regionPose(id, slopes);
        const box = regionFromSpec(REGION_SPECS[REGION_VIEWS[id].region]);
        boxCorners(box).forEach((point) =>
          expect(inFrame(pose, point, slopes), `${id} ${point.join(', ')}`).toBe(true),
        );
      });
      const lineUp = viewPose('lineUp', slopes);
      expect(lineUp).not.toBeNull();
      if (!lineUp) return;
      boxCorners(regionFromSpec(LINE_UP_VIEW.box)).forEach((point) =>
        expect(inFrame(lineUp, point, slopes), `lineUp ${point.join(', ')}`).toBe(true),
      );
    });
  });

  it('keeps every camera above the one-sided ground', () => {
    STAGES.forEach((slopes) =>
      CAMERA_VIEW_IDS.forEach((id) => {
        const pose = viewPose(id, slopes);
        expect(pose, id).not.toBeNull();
        expect(pose?.position.y, id).toBeGreaterThan(GROUND_Y);
      }),
    );
  });
});
