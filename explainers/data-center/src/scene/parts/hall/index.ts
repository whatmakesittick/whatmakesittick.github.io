import { BoxGeometry } from 'three';
import type { Extent } from '@core/scene/regions';
import type { AssemblyState, PartId } from '../../../ids';
import {
  ANCHOR_POINTS,
  BUSWAY,
  CDUS,
  FIBRE_ENTRY,
  HALL_RACKS,
  LEAF_RACKS,
  RACK,
  RISER,
  ROOM_WALL_X,
  ROW_PIPE,
  SPINE_RACKS,
  SUBJECT_CDU,
  SUBJECT_RACK,
  SUBJECT_ROW_INDEX,
  SUBJECT_SLOT,
  WALL_THICKNESS,
  boxTop,
  spanning,
  standing,
} from '../../../model';
import type { BoxSpec } from '../../../model';
import { PART_FINISHES } from '../../finishes';
import { boxMatrix, instancedMesh, label, namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';

const BUSWAY_M = 0.25;
const PIPE_M = 0.12;
const FIBRE_M = 0.4;

function along(centre: number, size: number): Extent {
  return [centre - size / 2, centre + size / 2];
}

function run(x: Extent, y: number, z: Extent, size = BUSWAY_M): BoxSpec {
  return spanning(x, along(y, size), z);
}

export function buildHall(context: PartContext): Section {
  const cube = context.tracker.track(new BoxGeometry());
  const root = namedGroup('hall');
  const part = (id: PartId, boxes: readonly BoxSpec[], top = boxTop(boxes[0])) => {
    const group = namedGroup(id, root);
    const matrices = boxes.map((box) => boxMatrix(box));
    group.add(instancedMesh(context, cube, id, PART_FINISHES[id], matrices));
    label(context, id, group, top);
    return group;
  };
  const others = HALL_RACKS.filter(
    ({ row, slot }) => row !== SUBJECT_ROW_INDEX || slot !== SUBJECT_SLOT,
  );
  part(
    'racks',
    others.map(({ base }) => standing(base, RACK)),
    boxTop(standing(others[Math.floor(others.length / 2)].base, RACK)),
  );
  const [rackX, , rackZ] = SUBJECT_RACK;
  part('busway', [
    run([ROOM_WALL_X + WALL_THICKNESS, BUSWAY.endX], BUSWAY.mainY, along(BUSWAY.mainZ, BUSWAY_M)),
    run(along(BUSWAY.endX, BUSWAY_M), BUSWAY.mainY, [BUSWAY.mainZ, rackZ]),
    spanning(along(BUSWAY.endX, BUSWAY_M), [BUSWAY.rowY, BUSWAY.mainY], along(rackZ, BUSWAY_M)),
    run([rackX, SUBJECT_CDU.base[0]], BUSWAY.rowY, along(rackZ, BUSWAY_M)),
  ]);
  const cdus = part('cdu', CDUS, boxTop(SUBJECT_CDU));
  sceneAnchor(context, 'cdu', cdus, ANCHOR_POINTS.cdu);
  const pipes = namedGroup('rowPipes', cdus);
  const riser = spanning(along(RISER.x, PIPE_M), [RISER.bottom, RISER.top], along(RISER.z, PIPE_M));
  const rowPipe = run([rackX, RISER.x], ROW_PIPE.y, along(ROW_PIPE.z, PIPE_M), PIPE_M);
  const pipeMatrices = [riser, rowPipe].map((box) => boxMatrix(box));
  pipes.add(instancedMesh(context, cube, 'facilityPipes', 'pipeInsulated', pipeMatrices));
  part('spineSwitches', SPINE_RACKS);
  part('leafSwitches', LEAF_RACKS);
  const [fibreX, fibreY, fibreZ] = FIBRE_ENTRY;
  part('fibreEntry', [
    spanning(along(fibreX, FIBRE_M), along(fibreY, FIBRE_M), [fibreZ - FIBRE_M, fibreZ]),
  ]);
  return {
    root,
    setState(state: AssemblyState) {
      cdus.visible = state.cooling === 'liquid';
    },
  };
}
