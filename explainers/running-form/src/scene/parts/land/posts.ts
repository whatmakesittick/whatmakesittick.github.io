import { BoxGeometry, CylinderGeometry, InstancedMesh, Mesh } from 'three';
import type { BufferGeometry, Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { DELINEATOR_HEIGHT_M, PATTERN_PERIODS_M, WALL } from '../../../model/layout';
import { DELINEATOR_Z_M, GROUND_EXTENT_M, LAMP_Z_M, PARAPET, RAIL } from '../../constants';
import { FINISHES } from '../../finishes';
import type { Finish } from '../../finishes';
import type { PartContext } from '../context';
import { LAMP, POST_OFFSETS, periodicItems } from './placement';
import { LONG_SEGMENTS, denseNearOrigin } from './spacing';
import { ScrollingInstances, copiesOf, NEAR_WINDOW } from './strip';
import type { StripItem } from './strip';
import { fadeNearCamera } from './nearFade';

const DELINEATOR = { widthM: 0.1, reflectorM: 0.12, reflectorTopM: 0.08 } as const;
const LAMP_PARTS = {
  poleTopRadiusM: 0.05,
  armRadiusM: 0.035,
  head: [0.24, 0.1, 0.6] as const,
  headDropM: 0.06,
  segments: 10,
} as const;
const RAIL_SEGMENTS = 8;

function instanced(
  context: PartContext,
  geometry: BufferGeometry,
  finish: Finish,
  items: readonly StripItem[],
): InstancedMesh {
  const material: Material = fadeNearCamera(
    context.materials.get(UNDIMMED_GROUP, FINISHES[finish]),
  );
  return new InstancedMesh(
    context.tracker.track(geometry),
    material,
    items.length * copiesOf(NEAR_WINDOW),
  );
}

function delineators(context: PartContext): { meshes: InstancedMesh[]; mover: ScrollingInstances } {
  const items = periodicItems(
    PATTERN_PERIODS_M.delineator,
    POST_OFFSETS.delineator,
    DELINEATOR_Z_M,
  );
  const post = new BoxGeometry(DELINEATOR.widthM, DELINEATOR_HEIGHT_M, DELINEATOR.widthM).translate(
    0,
    DELINEATOR_HEIGHT_M / 2,
    0,
  );
  const reflectorY = DELINEATOR_HEIGHT_M - DELINEATOR.reflectorTopM - DELINEATOR.reflectorM / 2;
  const reflector = new BoxGeometry(
    DELINEATOR.widthM * 1.08,
    DELINEATOR.reflectorM,
    DELINEATOR.widthM * 1.08,
  ).translate(0, reflectorY, 0);
  const meshes = [
    instanced(context, post, 'post', items),
    instanced(context, reflector, 'reflector', items),
  ];
  return {
    meshes,
    mover: new ScrollingInstances(
      meshes.map((mesh) => ({ mesh })),
      items,
    ),
  };
}

function lamps(context: PartContext): { meshes: InstancedMesh[]; mover: ScrollingInstances } {
  const items = periodicItems(PATTERN_PERIODS_M.lamp, POST_OFFSETS.lamp, LAMP_Z_M);
  const pole = new CylinderGeometry(
    LAMP_PARTS.poleTopRadiusM,
    LAMP.poleRadiusM,
    LAMP.heightM,
    LAMP_PARTS.segments,
  ).translate(0, LAMP.heightM / 2, 0);
  const arm = new CylinderGeometry(
    LAMP_PARTS.armRadiusM,
    LAMP_PARTS.armRadiusM,
    LAMP.armM,
    LAMP_PARTS.segments,
  )
    .rotateX(Math.PI / 2)
    .translate(0, LAMP.heightM - LAMP_PARTS.armRadiusM, -LAMP.armM / 2);
  const steel = mergeGeometries([pole.toNonIndexed(), arm.toNonIndexed()]);
  pole.dispose();
  arm.dispose();
  const [hx, hy, hz] = LAMP_PARTS.head;
  const head = new BoxGeometry(hx, hy, hz).translate(
    0,
    LAMP.heightM - LAMP_PARTS.headDropM,
    -LAMP.armM + hz / 2,
  );
  const meshes = [
    instanced(context, steel, 'lampPole', items),
    instanced(context, head, 'lampHead', items),
  ];
  return {
    meshes,
    mover: new ScrollingInstances(
      meshes.map((mesh) => ({ mesh })),
      items,
    ),
  };
}

function rail(context: PartContext): {
  meshes: (InstancedMesh | Mesh)[];
  mover: ScrollingInstances;
} {
  const items = periodicItems(RAIL.postSpacingM, POST_OFFSETS.railStanchion, WALL.zM);
  const postHeight = RAIL.topM - PARAPET.heightM;
  const stanchion = new CylinderGeometry(
    RAIL.postRadiusM,
    RAIL.postRadiusM,
    postHeight,
    RAIL_SEGMENTS,
  ).translate(0, PARAPET.heightM + postHeight / 2, 0);
  const stanchions = instanced(context, stanchion, 'rail', items);
  const material = fadeNearCamera(context.materials.get(UNDIMMED_GROUP, FINISHES.rail));
  const tubes = [RAIL.middleM, RAIL.topM - RAIL.tubeRadiusM].map((height) => {
    const geometry = new CylinderGeometry(
      RAIL.tubeRadiusM,
      RAIL.tubeRadiusM,
      GROUND_EXTENT_M * 2,
      RAIL_SEGMENTS,
      LONG_SEGMENTS,
    )
      .rotateZ(Math.PI / 2)
      .translate(0, height, WALL.zM);
    const tube = denseNearOrigin(geometry, 'x', GROUND_EXTENT_M);
    return new Mesh(context.tracker.track(tube), material);
  });
  return {
    meshes: [stanchions, ...tubes],
    mover: new ScrollingInstances([{ mesh: stanchions }], items),
  };
}

export function buildPosts(context: PartContext): {
  meshes: (InstancedMesh | Mesh)[];
  movers: ScrollingInstances[];
} {
  const parts = [delineators(context), lamps(context), rail(context)];
  return { meshes: parts.flatMap((part) => part.meshes), movers: parts.map((part) => part.mover) };
}
