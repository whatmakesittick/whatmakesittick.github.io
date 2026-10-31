import { BoxGeometry } from 'three';
import type { Group } from 'three';
import type { Extent } from '@core/scene/regions';
import type { AssemblyState, PartId } from '../../../ids';
import {
  AIR_HANDLERS,
  ANCHOR_POINTS,
  BATTERIES,
  BUILDING,
  CHILLER,
  CUTAWAY_ROOF_X,
  DRY_COOLERS,
  GANTRY,
  GENSETS,
  GRID_LINE,
  RISER,
  ROOF_HEADER_Z,
  ROOF_PIPE_Y,
  ROOF_Y,
  ROOM_WALL_X,
  SUBSTATION_YARD,
  SWITCHGEAR,
  TRANSFORMERS,
  UPS,
  WALL_THICKNESS,
  boxSpan,
  boxTop,
  spanning,
} from '../../../model';
import type { BoxSpec } from '../../../model';
import { PART_FINISHES } from '../../finishes';
import type { Finish } from '../../finishes';
import { SITE_GROUP, boxMatrix, instancedMesh, label, namedGroup, sceneAnchor } from '../context';
import type { EmphasisGroup, PartContext, Section } from '../context';

const GROUND: Extent = [-300, 300];
const GROUND_DEPTH_M = 0.2;
const ROAD_Z: Extent = [18, 24];
const ROAD_TOP_M = 0.02;
const CONDUCTOR_M = 0.08;
const SLAB_M = 0.3;
const PAD_M = 0.15;
const FLOOR_M = 0.01;
const PIPE_M = 0.3;

function conductor(index: number): BoxSpec {
  const z = GRID_LINE.z + (index - (GRID_LINE.conductors - 1) / 2) * GRID_LINE.conductorGap;
  const y = GRID_LINE.y;
  return spanning([GRID_LINE.fromX, GRID_LINE.toX], [y, y + CONDUCTOR_M], [z, z + CONDUCTOR_M]);
}

function pipeAlong(x: Extent, y: number, z: Extent): BoxSpec {
  return spanning(x, [y - PIPE_M / 2, y + PIPE_M / 2], z);
}

function around(centre: number): Extent {
  return [centre - PIPE_M / 2, centre + PIPE_M / 2];
}

export function buildCampus(context: PartContext): Section {
  const cube = context.tracker.track(new BoxGeometry());
  const root = namedGroup('campus');
  const add = (
    group: EmphasisGroup,
    boxes: readonly BoxSpec[],
    finish: Finish,
    parent: Group = root,
  ) => {
    const mesh = instancedMesh(
      context,
      cube,
      group,
      finish,
      boxes.map((box) => boxMatrix(box)),
    );
    parent.add(mesh);
    return mesh;
  };
  const part = (id: PartId, boxes: readonly BoxSpec[], top = boxTop(boxes[0])) => {
    const group = namedGroup(id, root);
    add(id, boxes, PART_FINISHES[id], group);
    label(context, id, group, top);
    return group;
  };
  add(SITE_GROUP, [spanning(GROUND, [-GROUND_DEPTH_M, 0], GROUND)], 'grass');
  add(SITE_GROUP, [spanning(GROUND, [0, ROAD_TOP_M], ROAD_Z)], 'road');
  part('gridLine', [
    GANTRY,
    ...Array.from({ length: GRID_LINE.conductors }, (_, i) => conductor(i)),
  ]);
  const yard = boxSpan(SUBSTATION_YARD);
  part('substation', [spanning(yard.x, [0, PAD_M], yard.z)]);
  part('transformers', TRANSFORMERS);
  part('generators', GENSETS);
  part('switchgear', [SWITCHGEAR]);
  part('ups', [UPS]);
  part('batteries', [BATTERIES]);
  const [west, east] = BUILDING.x;
  const [north, south] = BUILDING.z;
  const wallY: Extent = [0, ROOF_Y - SLAB_M];
  const roofY: Extent = [ROOF_Y - SLAB_M, ROOF_Y];
  const hall = part(
    'hall',
    [
      spanning([west, east], wallY, [north, north + WALL_THICKNESS]),
      spanning([west, west + WALL_THICKNESS], wallY, [north, south]),
      spanning([east - WALL_THICKNESS, east], wallY, [north, south]),
      spanning([ROOM_WALL_X - WALL_THICKNESS, ROOM_WALL_X], wallY, [north, south]),
      spanning([CUTAWAY_ROOF_X[1], east], roofY, [north, south]),
      spanning([west, east], [0, FLOOR_M], [north, south]),
    ],
    [ROOM_WALL_X, ROOF_Y, south],
  );
  const cut = [
    add('hall', [spanning([west, east], wallY, [south - WALL_THICKNESS, south])], 'cladding', hall),
    add('hall', [spanning(CUTAWAY_ROOF_X, roofY, [north, south])], 'roof', hall),
  ];
  part('chiller', [CHILLER]);
  const coolers = part('dryCoolers', DRY_COOLERS, boxTop(DRY_COOLERS[2]));
  sceneAnchor(context, 'roof', coolers, ANCHOR_POINTS.roof);
  const airHandlers = part('airHandlers', AIR_HANDLERS, boxTop(AIR_HANDLERS[2]));
  const pipeTop = ROOF_PIPE_Y + PIPE_M / 2;
  part(
    'facilityPipes',
    [
      spanning(around(RISER.x), [RISER.top, pipeTop], around(RISER.z)),
      pipeAlong(around(RISER.x), ROOF_PIPE_Y, [ROOF_HEADER_Z, RISER.z]),
      pipeAlong([RISER.x, boxSpan(DRY_COOLERS[0]).x[0]], ROOF_PIPE_Y, around(ROOF_HEADER_Z)),
    ],
    [RISER.x, pipeTop, RISER.z],
  );
  return {
    root,
    setState(state: AssemblyState) {
      cut.forEach((mesh) => (mesh.visible = !state.view.cutaway));
      airHandlers.visible = state.cooling === 'air';
    },
  };
}
