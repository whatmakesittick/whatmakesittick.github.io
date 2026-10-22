import { Color, InstancedMesh, Matrix4 } from 'three';
import type { BufferGeometry, Group, Material } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { BEAM_M } from '../../../model';
import { LINE_DRAW } from '../../constants';
import { FINISHES } from '../../finishes';
import { wrapOffset } from '../../pose';
import { LINE_GROUP, namedGroup, registeredMaterial } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { bearingModule, concreteModule } from './concrete';
import { DETAIL, LINE_FINISHES } from './constants';
import { PIER_LEVELS, cutMaterial, pierCutDefines } from './cut';
import type { CutUniform } from './cut';
import { cableModule, statorModule, trayModule } from './modules';
import { slotCentre, slotIndices } from './slots';
import { cantileverModule, railModule, stripModule } from './steel';

const ALL_SLOTS = slotIndices(BEAM_M, LINE_DRAW.behind, LINE_DRAW.ahead);
const isNear = (slot: number) => Math.abs(slotCentre(slot, BEAM_M)) <= DETAIL.nearReach;
const NEAR_SLOTS = ALL_SLOTS.filter(isNear);
const FAR_SLOTS = ALL_SLOTS.filter((slot) => !isNear(slot));
const TONE = { spread: 0.07, steps: 7, stride: 3 } as const;

type Detailed = (detailed: boolean) => BufferGeometry;

export interface GuidewayLooks {
  readonly concrete: MaterialFinish;
  readonly stator: Material;
  readonly cut: CutUniform;
}

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

function byDetail(context: PartContext, build: Detailed, look: Material): InstancedMesh[] {
  return [
    slotted(context, build(true), look, NEAR_SLOTS),
    slotted(context, build(false), look, FAR_SLOTS),
  ];
}

function toneBeams(mesh: InstancedMesh, slots: readonly number[]): InstancedMesh {
  const tone = new Color();
  slots.forEach((slot, index) => {
    const step = (((slot * TONE.stride) % TONE.steps) + TONE.steps) % TONE.steps;
    const shade = 1 - TONE.spread / 2 + (TONE.spread * step) / (TONE.steps - 1);
    mesh.setColorAt(index, tone.setScalar(shade));
  });
  return mesh;
}

export function buildGuideway(context: PartContext, looks: GuidewayLooks): Guideway {
  const group = namedGroup('guidewayStream');
  const cutLook = (emphasis: EmphasisGroup, finish: MaterialFinish, pierLevel?: number) =>
    registeredMaterial(
      context,
      emphasis,
      cutMaterial(finish, looks.cut, pierLevel === undefined ? {} : pierCutDefines(pierLevel)),
    );
  const concrete = cutLook(LINE_GROUP, looks.concrete, PIER_LEVELS.concrete);
  const steel = cutLook('guideway', LINE_FINISHES.paintedSteel);
  const tray = cutLook('feederCable', FINISHES.tray);
  group.add(
    toneBeams(slotted(context, concreteModule(true), concrete, NEAR_SLOTS), NEAR_SLOTS),
    toneBeams(slotted(context, concreteModule(false), concrete, FAR_SLOTS), FAR_SLOTS),
    slotted(
      context,
      bearingModule(),
      cutLook('piers', FINISHES.steel, PIER_LEVELS.bearings),
      ALL_SLOTS,
    ),
    slotted(context, stripModule(), cutLook('guideway', FINISHES.slideStrip), ALL_SLOTS),
    slotted(context, railModule(), cutLook('guidanceRails', FINISHES.guidanceRail), ALL_SLOTS),
    slotted(context, cableModule(), cutLook('feederCable', FINISHES.cable), NEAR_SLOTS),
    ...byDetail(context, cantileverModule, steel),
    ...byDetail(context, statorModule, looks.stator),
    ...byDetail(context, trayModule, tray),
  );
  return {
    group,
    slide(distance) {
      group.position.x = wrapOffset(distance, BEAM_M);
    },
  };
}
