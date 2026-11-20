import { BoxGeometry, Group, Mesh, Object3D, PlaneGeometry } from 'three';
import type { BufferGeometry, Material } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { Steps } from '@core/scene/pacing';
import { PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { regionBox } from './regions';
import {
  FLOAT_M,
  LANE_WIDTH_M,
  ROPE_Z_M,
  SCROLL_PERIOD_M,
  SLICE_HALF_LENGTH_M,
  WATER_DEPTH_M,
} from '../model/layout';
import { SEGMENT_M } from '../model/scale';
import { THEME } from '../theme';
import { bodyPose } from './pose';
import type { Assembly, AssemblyResources } from './assembly';

const BODY_LENGTH_M = 1.75;
const MARKER_M = 0.18;
const SURFACE_OPACITY = 0.45;
const ARM_THICKNESS_M = 0.12;

const ANCHOR_POSITIONS: Readonly<Record<PartId, readonly [number, number, number]>> = {
  hand: [0.9, -0.3, 0.3],
  forearm: [0.65, -0.25, 0.28],
  elbow: [0.4, -0.2, 0.26],
  shoulder: [0, -0.08, 0.2],
  head: [0.35, 0, 0],
  hips: [-0.54, -0.12, 0],
  foot: [-1.7, -0.12, 0.1],
  waterline: [0.6, 0, 0.7],
  laneRope: [0.2, 0, ROPE_Z_M],
  laneLine: [-0.9, -WATER_DEPTH_M, 0],
};

const ANCHOR_PARENTS: Readonly<Record<AnchorId, PartId>> = {
  swimmer: 'shoulder',
  rightHand: 'hand',
  head: 'head',
};

function mesh(geometry: BufferGeometry, material: Material, x: number, y: number, z: number): Mesh {
  const result = new Mesh(geometry, material);
  result.position.set(x, y, z);
  return result;
}

export function* createPlaceholderAssembly(
  { materials }: AssemblyResources,
  initial: AssemblyState,
): Steps<Assembly> {
  const root = new Group();
  const swimmer = new Group();
  const pool = new Group();
  const geometries: BufferGeometry[] = [];
  const box = (x: number, y: number, z: number): BoxGeometry => {
    const geometry = new BoxGeometry(x, y, z);
    geometries.push(geometry);
    return geometry;
  };

  const body = materials.get('hips', { color: THEME.suit });
  const skin = materials.get('head', { color: THEME.cap });
  const rightSide = materials.get('shoulder', { color: THEME.rightSide });
  const forward = materials.get('foot', { color: THEME.forward });
  const arm = materials.get('hand', { color: THEME.skin });
  const water = materials.get(UNDIMMED_GROUP, {
    color: THEME.water,
    transparent: true,
    opacity: SURFACE_OPACITY,
  });
  const floor = materials.get(UNDIMMED_GROUP, { color: THEME.poolFloor });
  const rope = materials.get(UNDIMMED_GROUP, { color: THEME.floatA });

  swimmer.add(
    mesh(
      box(BODY_LENGTH_M, SEGMENT_M.chestWidth, SEGMENT_M.hipWidth),
      body,
      -BODY_LENGTH_M / 2 + 0.3,
      0,
      0,
    ),
  );
  swimmer.add(mesh(box(SEGMENT_M.head, SEGMENT_M.head, SEGMENT_M.head), skin, 0.35, 0.02, 0));
  swimmer.add(mesh(box(MARKER_M, MARKER_M, MARKER_M), forward, 0.55, 0, 0));
  swimmer.add(mesh(box(MARKER_M, MARKER_M, MARKER_M), rightSide, 0, 0, SEGMENT_M.shoulderSpacing));
  swimmer.add(
    mesh(
      box(
        SEGMENT_M.upperArm + SEGMENT_M.forearm + SEGMENT_M.hand,
        ARM_THICKNESS_M,
        ARM_THICKNESS_M,
      ),
      arm,
      0.6,
      -0.25,
      0.28,
    ),
  );
  root.add(swimmer, pool);
  yield;

  const surface = new Mesh(new PlaneGeometry(SLICE_HALF_LENGTH_M * 2, LANE_WIDTH_M), water);
  surface.rotation.x = -Math.PI / 2;
  const bed = new Mesh(new PlaneGeometry(SLICE_HALF_LENGTH_M * 2, LANE_WIDTH_M), floor);
  bed.rotation.x = -Math.PI / 2;
  bed.position.y = -WATER_DEPTH_M;
  geometries.push(surface.geometry, bed.geometry);
  root.add(surface, bed);

  const floatCount = Math.round((SLICE_HALF_LENGTH_M * 2) / SCROLL_PERIOD_M);
  const floatGeometry = box(FLOAT_M, FLOAT_M, FLOAT_M);
  for (let index = 0; index < floatCount; index++) {
    const x = -SLICE_HALF_LENGTH_M + index * SCROLL_PERIOD_M;
    pool.add(mesh(floatGeometry, rope, x, 0, ROPE_Z_M), mesh(floatGeometry, rope, x, 0, -ROPE_Z_M));
  }

  const anchors = new Map<PartId, Object3D>();
  PART_IDS.forEach((id) => {
    const anchor = new Object3D();
    const [x, y, z] = ANCHOR_POSITIONS[id];
    anchor.position.set(x, y, z);
    (id === 'waterline' || id === 'laneRope' || id === 'laneLine' ? root : swimmer).add(anchor);
    anchors.set(id, anchor);
  });

  const apply = (state: AssemblyState): void => {
    const pose = bodyPose(state.headUp ? 1 : 0, state.reading.surgeM);
    swimmer.position.set(pose.x, pose.y + 0.12, 0);
    swimmer.rotation.z = pose.pitchRad;
    pool.position.x = -(state.reading.scrollM % SCROLL_PERIOD_M);
    surface.visible = !state.view.underwater;
  };
  apply(initial);

  return {
    root,
    setState: apply,
    update: () => false,
    labelAnchors: () => anchors,
    anchor: (id) => anchors.get(ANCHOR_PARENTS[id]) ?? swimmer,
    region: (id: RegionId) => regionBox(id),
    dispose: () => geometries.forEach((geometry) => geometry.dispose()),
  };
}
