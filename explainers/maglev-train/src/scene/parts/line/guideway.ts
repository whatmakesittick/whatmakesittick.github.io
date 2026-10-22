import { Color, InstancedMesh, Matrix4 } from 'three';
import type { BufferGeometry, Group, Material } from 'three';
import { BEAM_M } from '../../../model';
import { LINE_DRAW } from '../../constants';
import { FINISHES } from '../../finishes';
import type { Finish } from '../../finishes';
import { wrapOffset } from '../../pose';
import { namedGroup } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { bearingModule, concreteModule } from './concrete';
import { DETAIL } from './constants';
import { cableModule, statorModule, trayModule } from './modules';
import { slotCentre, slotIndices } from './slots';
import { cantileverModule, railModule, stripModule } from './steel';

const ALL_SLOTS = slotIndices(BEAM_M, LINE_DRAW.behind, LINE_DRAW.ahead);
const isNear = (slot: number) => Math.abs(slotCentre(slot, BEAM_M)) <= DETAIL.nearReach;
const NEAR_SLOTS = ALL_SLOTS.filter(isNear);
const FAR_SLOTS = ALL_SLOTS.filter((slot) => !isNear(slot));
const TONE = { spread: 0.07, steps: 7, stride: 3 } as const;

type Detailed = (detailed: boolean) => BufferGeometry;

export interface Guideway {
  readonly group: Group;
  slide(distance: number): void;
}

function slotted(
  context: PartContext,
  geometry: BufferGeometry,
  material: Material,
  slots: readonly number[],
): InstancedMesh {
  const mesh = new InstancedMesh(context.tracker.track(geometry), material, slots.length);
  const matrix = new Matrix4();
  slots.forEach((slot, index) => {
    mesh.setMatrixAt(index, matrix.makeTranslation(slotCentre(slot, BEAM_M), 0, 0));
  });
  mesh.computeBoundingSphere();
  return context.tracker.track(mesh);
}

function material(context: PartContext, group: EmphasisGroup, finish: Finish): Material {
  return context.materials.get(group, FINISHES[finish]);
}

function byDetail(context: PartContext, build: Detailed, look: Material): InstancedMesh[] {
  return [
    slotted(context, build(true), look, NEAR_SLOTS),
    slotted(context, build(false), look, FAR_SLOTS),
  ];
}

function toneBeams(mesh: InstancedMesh): InstancedMesh {
  const tone = new Color();
  ALL_SLOTS.forEach((slot, index) => {
    const step = (((slot * TONE.stride) % TONE.steps) + TONE.steps) % TONE.steps;
    const shade = 1 - TONE.spread / 2 + (TONE.spread * step) / (TONE.steps - 1);
    mesh.setColorAt(index, tone.setScalar(shade));
  });
  return mesh;
}

export function buildGuideway(
  context: PartContext,
  concrete: Material,
  stator: Material,
): Guideway {
  const group = namedGroup('guidewayStream');
  const steel = material(context, 'guideway', 'steel');
  const tray = material(context, 'feederCable', 'tray');
  group.add(
    toneBeams(slotted(context, concreteModule(), concrete, ALL_SLOTS)),
    slotted(context, bearingModule(), material(context, 'piers', 'steel'), ALL_SLOTS),
    slotted(context, stripModule(), material(context, 'guideway', 'slideStrip'), ALL_SLOTS),
    slotted(context, railModule(), material(context, 'guidanceRails', 'guidanceRail'), ALL_SLOTS),
    slotted(context, cableModule(), material(context, 'feederCable', 'cable'), NEAR_SLOTS),
    ...byDetail(context, cantileverModule, steel),
    ...byDetail(context, statorModule, stator),
    ...byDetail(context, trayModule, tray),
  );
  return {
    group,
    slide(distance) {
      group.position.x = wrapOffset(distance, BEAM_M);
    },
  };
}
