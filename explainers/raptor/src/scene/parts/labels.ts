import type { Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { PART_IDS, STREAM_IDS } from '../../ids';
import type { AnchorId, PartId, StreamId } from '../../ids';
import {
  ACTUATORS,
  BOOSTER,
  BOOSTER_AXIS,
  CHAMBER,
  GIMBAL,
  HOT_GAS_MANIFOLD,
  INJECTOR,
  INLETS,
  NOZZLE_EXIT,
  PREBURNERS,
  THROAT,
  TURBOPUMPS,
  wallRadius,
} from '../../model';
import type { PlumeShape, Point } from '../../model';
import { ANCHOR_LIFT, PLUME, PLUME_LABEL_DEPTH, WALL_LAYERS, WALL_OUTSET } from '../constants';
import { labelPoint } from './flow/flowStreams';

const CHANNEL_LABEL_Y = -230;
const CHANNEL_LABEL_ANGLE = (70 * Math.PI) / 180;
const NOZZLE_LABEL_Y = -260;
const BOOSTER_LABEL_HEIGHT = 200;

export const ANCHOR_POINTS: Readonly<Record<AnchorId, Point>> = {
  gimbal: GIMBAL.centre,
  oxygenPump: TURBOPUMPS.oxygen.centre,
  methanePump: TURBOPUMPS.methane.centre,
  oxygenPreburner: PREBURNERS.oxygen.centre,
  methanePreburner: PREBURNERS.methane.centre,
  injector: [0, INJECTOR.y, 0],
  chamber: [0, (CHAMBER.top + CHAMBER.bottom) / 2, 0],
  throat: [0, THROAT.y, 0],
  nozzleExit: [0, NOZZLE_EXIT.y, 0],
  plume: [0, NOZZLE_EXIT.y - PLUME_LABEL_DEPTH, 0],
};

function lifted([x, y, z]: Point): Point {
  return [x, y, z + ANCHOR_LIFT];
}

function channelOutside(): Point {
  const radius = wallRadius(CHANNEL_LABEL_Y) + WALL_OUTSET + ANCHOR_LIFT;
  return [
    radius * Math.cos(CHANNEL_LABEL_ANGLE),
    CHANNEL_LABEL_Y,
    radius * Math.sin(CHANNEL_LABEL_ANGLE),
  ];
}

function channelCut(): Point {
  const radius = wallRadius(CHANNEL_LABEL_Y) + WALL_LAYERS.liner + WALL_LAYERS.channel / 2;
  return lifted([radius, CHANNEL_LABEL_Y, 0]);
}

function streamLabel(id: StreamId): Point {
  return lifted(labelPoint(id));
}

export interface LabelPlacement {
  whole: Point;
  cut: Point;
}

function fixed(point: Point): LabelPlacement {
  return { whole: point, cut: point };
}

export function labelPlacements(): Readonly<Record<Exclude<PartId, 'booster'>, LabelPlacement>> {
  const streams = Object.fromEntries(
    STREAM_IDS.map((id) => [id, fixed(streamLabel(id))]),
  ) as Record<StreamId, LabelPlacement>;
  return {
    gimbal: fixed(lifted(GIMBAL.centre)),
    actuators: fixed(lifted(ACTUATORS[0].bottom)),
    oxygenInlet: fixed(lifted(INLETS.oxygen.centre)),
    methaneInlet: fixed(lifted(INLETS.methane.centre)),
    oxygenPump: fixed(lifted(TURBOPUMPS.oxygen.centre)),
    methanePump: fixed(lifted(TURBOPUMPS.methane.centre)),
    oxygenPreburner: fixed(lifted(PREBURNERS.oxygen.centre)),
    methanePreburner: fixed(lifted(PREBURNERS.methane.centre)),
    hotGasManifold: fixed(lifted([HOT_GAS_MANIFOLD.radius, HOT_GAS_MANIFOLD.y, 0])),
    injector: fixed(lifted([0, INJECTOR.y, 0])),
    chamber: fixed(lifted([CHAMBER.radius, (CHAMBER.top + CHAMBER.bottom) / 2, 0])),
    throat: fixed(lifted([THROAT.radius, THROAT.y, 0])),
    coolingChannels: { whole: channelOutside(), cut: channelCut() },
    nozzle: fixed(lifted([wallRadius(NOZZLE_LABEL_Y) + WALL_OUTSET, NOZZLE_LABEL_Y, 0])),
    plume: fixed(lifted(ANCHOR_POINTS.plume)),
    shockDiamonds: fixed(lifted([0, NOZZLE_EXIT.y - PLUME.firstDiamond * 128, 0])),
    ...streams,
  };
}

export const BOOSTER_LABEL: Point = [
  BOOSTER_AXIS.x,
  BOOSTER.baseY + BOOSTER_LABEL_HEIGHT,
  BOOSTER_AXIS.z + BOOSTER.radius + ANCHOR_LIFT,
];

export interface LabelHost {
  object: Object3D;
  offset: Point;
}

export type LabelHosts = Partial<Record<PartId, LabelHost>>;

export class LabelAnchors {
  readonly labels = new Map<PartId, Object3D>();
  readonly anchors = new Map<AnchorId, Object3D>();
  private readonly placements = labelPlacements();
  private readonly hosts: LabelHosts;

  constructor(engine: Object3D, cluster: Object3D, hosts: LabelHosts = {}) {
    this.hosts = { booster: { object: cluster, offset: [0, 0, 0] }, ...hosts };
    for (const id of Object.keys(ANCHOR_POINTS) as AnchorId[]) {
      const [x, y, z] = ANCHOR_POINTS[id];
      this.anchors.set(id, anchorAt(engine, x, y, z));
    }
    for (const id of PART_IDS) {
      const parent = this.hosts[id]?.object ?? engine;
      const point = id === 'booster' ? BOOSTER_LABEL : this.placements[id].whole;
      const anchor = anchorAt(parent, 0, 0, 0);
      this.labels.set(id, anchor);
      this.place(id, point);
    }
  }

  setCutaway(cut: boolean): void {
    for (const [id, placement] of Object.entries(this.placements)) {
      this.place(id as PartId, cut ? placement.cut : placement.whole);
    }
  }

  setPlume(shape: PlumeShape): void {
    if (shape.diamondSpacing <= 0) return;
    const [x, , z] = this.placements.shockDiamonds.whole;
    this.place('shockDiamonds', [x, NOZZLE_EXIT.y - shape.diamondSpacing * PLUME.firstDiamond, z]);
  }

  private place(id: PartId, [x, y, z]: Point): void {
    const [ox, oy, oz] = this.hosts[id]?.offset ?? [0, 0, 0];
    this.labels.get(id)?.position.set(x - ox, y - oy, z - oz);
  }
}
