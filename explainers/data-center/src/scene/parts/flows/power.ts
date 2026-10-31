import type { Group } from 'three';
import { clamp } from '@core/math';
import type { AssemblyState, CarrierId, JouleReading, PhaseId, Point } from '../../../ids';
import {
  ENERGY_PATH,
  GENERATOR_ROW_Z,
  GENSET,
  GENSETS,
  MOMENTS,
  MV_ENTRY,
  SWITCHGEAR,
  WAYPOINTS,
  legsFor,
  pathLength,
} from '../../../model';
import { THEME } from '../../../theme';
import { namedGroup } from '../context';
import type { EmphasisGroup, OutageSample, PartContext } from '../context';
import { GENERATOR_FEED, IDLE_DENSITY, PARTICLE_PX } from './constants';
import { Stream } from './stream';
import { Track, legPoints } from './track';
import { Trail } from './trail';

const POWER_PHASES: readonly PhaseId[] = ['grid', 'protect', 'distribute', 'compute'];
const GRID_CARRIERS: ReadonlySet<CarrierId> = new Set(['line', 'cable']);
const POWER_LEGS = ENERGY_PATH.liquid.filter(
  ({ phase, carrier }) => POWER_PHASES.includes(phase) && carrier !== 'chip',
);
const GRID_LEGS = POWER_LEGS.filter(({ carrier }) => GRID_CARRIERS.has(carrier));
const FEED_LEGS = POWER_LEGS.filter(({ carrier }) => !GRID_CARRIERS.has(carrier));

interface Run {
  readonly stream: Stream;
  readonly trail: Trail;
  readonly start: number;
}

export function powerReach({ phase, share, units }: JouleReading): number {
  const index = POWER_PHASES.indexOf(phase);
  if (index < 0) return Infinity;
  const before = POWER_PHASES.slice(0, index).reduce(
    (sum, earlier) => sum + pathLength(legsFor('liquid', earlier)),
    0,
  );
  const travel =
    phase === 'compute'
      ? clamp((units - MOMENTS.atRack) / (MOMENTS.becomesHeat - MOMENTS.atRack), 0, 1)
      : share;
  return before + travel * pathLength(legsFor('liquid', phase));
}

function generatorRoute(rowZ: number): Point[] {
  const eastX = Math.max(
    ...GENSETS.filter(({ base }) => base[2] === rowZ).map(({ base }) => base[0]),
  );
  const sideZ = rowZ + GENSET.depth / 2 + GENERATOR_FEED.sideGap;
  const y = MV_ENTRY[1];
  return [
    [eastX, y, sideZ],
    [GENERATOR_FEED.aisleX, y, sideZ],
    [GENERATOR_FEED.aisleX, y, SWITCHGEAR.base[2]],
    WAYPOINTS.switchgear,
  ];
}

function run(
  context: PartContext,
  parent: Group,
  group: EmphasisGroup,
  points: readonly Point[],
  start: number,
): Run {
  const track = new Track(points);
  const stream = new Stream(context, group, track, PARTICLE_PX.power);
  const trail = new Trail(context, group, track, { color: THEME.current });
  parent.add(trail.object, stream.object);
  return { stream, trail, start };
}

export class PowerFlow {
  readonly object = namedGroup('powerFlow');
  private readonly mains: readonly Run[];
  private readonly generators: readonly Run[];
  private reach = 0;
  private density = 1;

  constructor(context: PartContext, parent: Group) {
    parent.add(this.object);
    const gridLength = pathLength(GRID_LEGS);
    this.mains = [
      run(context, this.object, 'gridLine', legPoints(GRID_LEGS), 0),
      run(context, this.object, 'busway', legPoints(FEED_LEGS), gridLength),
    ];
    this.generators = GENERATOR_ROW_Z.map((z) =>
      run(context, this.object, 'generators', generatorRoute(z), 0),
    );
  }

  setState(state: AssemblyState): void {
    this.object.visible = state.view.power;
    this.reach = powerReach(state.joule);
    this.density = state.load === 'full' ? 1 : IDLE_DENSITY;
  }

  animate(time: number, outage: OutageSample): void {
    if (!this.object.visible) return;
    const generatorShare = outage.active ? outage.generatorShare : 0;
    const gridShare = outage.active ? clamp(1 - outage.batteryShare - generatorShare, 0, 1) : 1;
    this.mains.forEach((entry, index) =>
      this.place(entry, time, this.reach - entry.start, index === 0 ? gridShare : 1),
    );
    this.generators.forEach((entry) => this.place(entry, time, Infinity, generatorShare));
  }

  private place({ stream, trail }: Run, time: number, reach: number, strength: number): void {
    const metres = Math.min(reach, stream.length);
    trail.set(metres, time, strength);
    trail.object.visible = strength > 0 && metres > 0;
    stream.place(time, {
      reach: stream.flowAt(metres),
      density: this.density,
      alpha: strength,
      color: THEME.current,
    });
  }
}
