import { BoxGeometry } from 'three';
import type { Group } from 'three';
import type { Extent } from '@core/scene/regions';
import type { AssemblyState, PartId } from '../../../ids';
import {
  ANCHOR_POINTS,
  BUSBAR,
  COMPUTE_TRAY_PITCH,
  DESK,
  INSET,
  INSET_CENTRE,
  LAPTOP,
  LOWER_COMPUTE_TRAYS,
  MANIFOLD,
  RACK,
  RACK_STACK,
  SHELVES_PER_GROUP,
  SUBJECT_RACK,
  SUBJECT_RACK_BOX,
  SUBJECT_TRAY_Y,
  SWITCH_TRAYS,
  UPPER_COMPUTE_TRAYS,
  boxSpan,
  boxTop,
  spanning,
} from '../../../model';
import type { BoxSpec } from '../../../model';
import { PART_FINISHES } from '../../finishes';
import type { Finish } from '../../finishes';
import { boxMatrix, instancedMesh, label, namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';

const PANEL_M = 0.02;
const SLAB_GAP_M = 0.004;
const BUSBAR_M = 0.05;
const PIPE_M = 0.05;
const FAN_M = 0.03;
const SHELF_DEPTH_SHARE = 0.9;
const SPAN = boxSpan(SUBJECT_RACK_BOX);
const [RACK_X, , RACK_Z] = SUBJECT_RACK;

function stack([from, to]: Extent, count: number, pitch = (to - from) / count): Extent[] {
  return Array.from({ length: count }, (_, index) => [
    from + index * pitch + SLAB_GAP_M,
    from + (index + 1) * pitch - SLAB_GAP_M,
  ]);
}

function slab(band: Extent, depthShare = 1): BoxSpec {
  const inner: Extent = [SPAN.x[0] + PANEL_M, SPAN.x[1] - PANEL_M];
  return spanning(inner, band, [SPAN.z[0], SPAN.z[0] + (RACK.depth - PANEL_M) * depthShare]);
}

function around(centre: number, size: number): Extent {
  return [centre - size / 2, centre + size / 2];
}

export function buildRack(context: PartContext): Section {
  const cube = context.tracker.track(new BoxGeometry());
  const root = namedGroup('rack');
  const add = (id: PartId, boxes: readonly BoxSpec[], parent: Group, finish?: Finish) => {
    const matrices = boxes.map((box) => boxMatrix(box));
    parent.add(instancedMesh(context, cube, id, finish ?? PART_FINISHES[id], matrices));
  };
  const part = (id: PartId, boxes: readonly BoxSpec[], top = boxTop(boxes[0]), parent = root) => {
    const group = namedGroup(id, parent);
    add(id, boxes, group);
    label(context, id, group, top);
    return group;
  };
  const rack = part(
    'subjectRack',
    [
      spanning([SPAN.x[1] - PANEL_M, SPAN.x[1]], SPAN.y, SPAN.z),
      spanning(SPAN.x, [RACK.height - PANEL_M, RACK.height], SPAN.z),
      spanning(SPAN.x, RACK_STACK.base, SPAN.z),
      spanning(SPAN.x, SPAN.y, [SPAN.z[1] - PANEL_M, SPAN.z[1]]),
    ],
    boxTop(SUBJECT_RACK_BOX),
  );
  const westPanel = namedGroup('westPanel', rack);
  add('subjectRack', [spanning([SPAN.x[0], SPAN.x[0] + PANEL_M], SPAN.y, SPAN.z)], westPanel);
  sceneAnchor(context, 'subjectRack', rack, ANCHOR_POINTS.subjectRack);
  sceneAnchor(context, 'chip', rack, ANCHOR_POINTS.chip);
  const west = SPAN.x[0];
  const shelves = [RACK_STACK.lowerShelves, RACK_STACK.upperShelves].flatMap((band) =>
    stack(band, SHELVES_PER_GROUP).map((shelf) => slab(shelf, SHELF_DEPTH_SHARE)),
  );
  part('powerShelves', shelves, [west, RACK_STACK.upperShelves[1], RACK_Z]);
  const bars = [BUSBAR.lower, BUSBAR.upper].map((zone) =>
    spanning(around(RACK_X, BUSBAR_M * 2), zone, around(BUSBAR.z, BUSBAR_M)),
  );
  part('busbar', bars, [RACK_X, BUSBAR.upper[1], BUSBAR.z]);
  const trays = [
    ...stack(RACK_STACK.lowerCompute, LOWER_COMPUTE_TRAYS),
    ...stack(RACK_STACK.upperCompute, UPPER_COMPUTE_TRAYS, COMPUTE_TRAY_PITCH),
  ];
  part(
    'computeTrays',
    trays.map((band) => slab(band)),
    [west, SUBJECT_TRAY_Y, RACK_Z],
  );
  const switches = stack(RACK_STACK.switchTrays, SWITCH_TRAYS).map((band) => slab(band));
  part('switchTrays', switches, [west, RACK_STACK.switchTrays[1], RACK_Z]);
  const fans = trays.map(([from, to]) =>
    spanning(around(RACK_X, to - from), [from, to], [SPAN.z[0] - FAN_M, SPAN.z[0]]),
  );
  part('trayFans', fans, [RACK_X, SUBJECT_TRAY_Y, SPAN.z[0]]);
  const pipes = [MANIFOLD.supplyX, MANIFOLD.returnX].map((x) =>
    spanning(around(x, PIPE_M), [RACK_STACK.base[1], RACK.height], around(MANIFOLD.z, PIPE_M)),
  );
  const manifold = part('manifold', pipes, [MANIFOLD.returnX, BUSBAR.lower[1], MANIFOLD.z]);
  const [insetX, insetY, insetZ] = INSET_CENTRE;
  const inset = part(
    'chipInset',
    [
      spanning(
        around(insetX, INSET.depth),
        around(insetY, INSET.height),
        around(insetZ, INSET.width),
      ),
    ],
    [insetX, insetY + INSET.height / 2, insetZ],
  );
  sceneAnchor(context, 'inset', inset, ANCHOR_POINTS.inset);
  const lineUp = part('laptop', [LAPTOP]);
  add('laptop', [DESK], lineUp, 'desk');
  sceneAnchor(context, 'lineUp', lineUp, ANCHOR_POINTS.lineUp);
  return {
    root,
    setState(state: AssemblyState) {
      westPanel.visible = !state.view.cutaway;
      inset.visible = state.view.inset;
      lineUp.visible = state.view.lineUp;
      manifold.visible = state.cooling === 'liquid';
    },
  };
}
