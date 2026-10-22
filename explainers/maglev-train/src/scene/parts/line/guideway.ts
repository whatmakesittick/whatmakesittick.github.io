import { Color, InstancedMesh, Matrix4 } from 'three';
import type { BufferGeometry, Material } from 'three';
import { BEAM_M } from '../../../model';
import { LINE_DRAW } from '../../constants';
import { FINISHES } from '../../finishes';
import type { Finish } from '../../finishes';
import { wrapOffset } from '../../pose';
import { LINE_GROUP, namedGroup } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { bearingModule, concreteModule } from './concrete';
import { cableModule, statorModule, trayModule } from './modules';
import { slotCentre, slotIndices } from './slots';
import { cantileverModule, railModule, stripModule } from './steel';

const SLOTS = slotIndices(BEAM_M, LINE_DRAW.behind, LINE_DRAW.ahead);
const TONE_SPREAD = 0.06;
const TONE_STEPS = 7;
const TONE_STRIDE = 3;

export interface Guideway {
  readonly group: ReturnType<typeof namedGroup>;
  slide(distance: number): void;
}

function placeSlots(mesh: InstancedMesh): InstancedMesh {
  const matrix = new Matrix4();
  SLOTS.forEach((slot, index) => {
    mesh.setMatrixAt(index, matrix.makeTranslation(slotCentre(slot, BEAM_M), 0, 0));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function slotted(
  context: PartContext,
  geometry: BufferGeometry,
  material: Material,
): InstancedMesh {
  const mesh = new InstancedMesh(context.tracker.track(geometry), material, SLOTS.length);
  return placeSlots(context.tracker.track(mesh));
}

function finished(
  context: PartContext,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: Finish,
): InstancedMesh {
  return slotted(context, geometry, context.materials.get(group, FINISHES[finish]));
}

function toneBeams(mesh: InstancedMesh): InstancedMesh {
  const tone = new Color();
  SLOTS.forEach((slot, index) => {
    const step = (((slot * TONE_STRIDE) % TONE_STEPS) + TONE_STEPS) % TONE_STEPS;
    const shade = 1 - TONE_SPREAD / 2 + (TONE_SPREAD * step) / (TONE_STEPS - 1);
    mesh.setColorAt(index, tone.setScalar(shade));
  });
  return mesh;
}

export function buildGuideway(context: PartContext, statorMaterial: Material): Guideway {
  const group = namedGroup('guidewayStream');
  const meshes = [
    toneBeams(finished(context, concreteModule(), LINE_GROUP, 'concrete')),
    finished(context, bearingModule(), 'piers', 'steel'),
    finished(context, cantileverModule(), 'guideway', 'steel'),
    finished(context, stripModule(), 'guideway', 'slideStrip'),
    finished(context, railModule(), 'guidanceRails', 'guidanceRail'),
    slotted(context, statorModule(), statorMaterial),
    finished(context, trayModule(), 'feederCable', 'tray'),
    finished(context, cableModule(), 'feederCable', 'cable'),
  ];
  group.add(...meshes);
  return {
    group,
    slide(distance) {
      group.position.x = wrapOffset(distance, BEAM_M);
    },
  };
}
