import { Group, Matrix4, Object3D, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh, Material } from 'three';
import { anchorAt } from '@core/scene/parts';
import { NOZZLE_IDS, NOZZLE_PARTS } from '../../../ids';
import type { AssemblyState, NozzleId, NozzlePartId, PartId } from '../../../ids';
import { NOZZLES } from '../../../model/layout';
import { BELL_LENGTH, coneGeometry, nozzleGeometry, nozzleReach } from '../../geometry/gear/nozzle';
import { instancedPart } from '../context';
import type { PartContext } from '../context';
import { duskEnvironment } from '../../environment';
import { CONE_FINISHES, GEAR_FINISHES, GEAR_PAINT, reflectiveFinishes } from './gearFinishes';

const NOZZLE_GROUPS: readonly NozzlePartId[] = ['cornerNozzles', 'frontNozzles', 'rearNozzles'];

const LABELLED: Readonly<Record<NozzlePartId, NozzleId>> = {
  cornerNozzles: 'cornerFrontRight',
  frontNozzles: 'frontRight',
  rearNozzles: 'rearOuterRight',
};

const BELL_UP = new Vector3(0, 1, 0);

const TONES = { bell: GEAR_PAINT.nozzleBody, collar: GEAR_PAINT.collar } as const;

export interface NozzleSet {
  readonly object: Group;
  readonly labels: ReadonlyMap<PartId, Object3D>;
  mouth(id: NozzleId): Object3D;
  setState(state: AssemblyState): void;
}

interface NozzleGroup {
  ids: readonly NozzleId[];
  frames: readonly Matrix4[];
  body: InstancedMesh;
  frost: InstancedMesh;
  cones: InstancedMesh;
  firing: number;
}

function nozzleFrame(id: NozzleId): Object3D {
  const frame = new Object3D();
  frame.position.set(...NOZZLES[id].at);
  frame.quaternion.setFromUnitVectors(BELL_UP, new Vector3(...NOZZLES[id].dir).normalize());
  frame.updateMatrix();
  return frame;
}

function addMouth(frame: Object3D, id: NozzleId): Object3D {
  const mouth = anchorAt(frame, 0, nozzleReach(id), 0);
  mouth.name = id;
  return mouth;
}

function instanced(
  context: PartContext,
  geometry: BufferGeometry,
  material: Material,
  frames: readonly Matrix4[],
): InstancedMesh {
  const mesh = instancedPart(context, geometry, material, frames.length);
  frames.forEach((frame, index) => mesh.setMatrixAt(index, frame));
  mesh.computeBoundingSphere();
  mesh.computeBoundingBox();
  return mesh;
}

function idsOf(part: NozzlePartId): NozzleId[] {
  return NOZZLE_IDS.filter((id) => NOZZLE_PARTS[id] === part);
}

function buildGroup(
  context: PartContext,
  part: NozzlePartId,
  frames: readonly Object3D[],
): NozzleGroup {
  const { materials, tracker } = context;
  const ids = idsOf(part);
  const poses = frames.map((frame) => frame.matrix);
  const reach = nozzleReach(ids[0]);
  const shape = nozzleGeometry(reach, TONES);
  const lift = new Matrix4().makeTranslation(0, reach, 0);
  const tips = poses.map((pose) => pose.clone().multiply(lift));
  const cones = instanced(context, coneGeometry(), materials.get(part, CONE_FINISHES[part]), tips);
  cones.visible = false;
  return {
    ids,
    frames: poses,
    body: instanced(
      context,
      shape,
      materials.get(part, reflectiveFinishes(duskEnvironment(tracker)).nozzleBody),
      poses,
    ),
    frost: instanced(context, shape, materials.get(part, GEAR_FINISHES.frost), poses),
    cones,
    firing: -1,
  };
}

function firingMask(group: NozzleGroup, state: AssemblyState): number {
  let mask = 0;
  for (let index = 0; index < group.ids.length; index += 1) {
    if (state.nozzles[group.ids[index]] > 0) mask |= 1 << index;
  }
  return mask;
}

function showFiring(group: NozzleGroup, mask: number): void {
  let frosted = 0;
  let plain = 0;
  for (let index = 0; index < group.ids.length; index += 1) {
    const lit = (mask & (1 << index)) !== 0;
    if (lit) group.frost.setMatrixAt(frosted++, group.frames[index]);
    else group.body.setMatrixAt(plain++, group.frames[index]);
  }
  group.frost.count = frosted;
  group.body.count = plain;
  group.frost.visible = frosted > 0;
  group.body.visible = plain > 0;
  group.frost.instanceMatrix.needsUpdate = true;
  group.body.instanceMatrix.needsUpdate = true;
  group.firing = mask;
}

export function createNozzles(context: PartContext): NozzleSet {
  const object = new Group();
  const frames = Object.fromEntries(NOZZLE_IDS.map((id) => [id, nozzleFrame(id)])) as Record<
    NozzleId,
    Object3D
  >;
  const mouths = Object.fromEntries(
    NOZZLE_IDS.map((id) => [id, addMouth(frames[id], id)]),
  ) as Record<NozzleId, Object3D>;
  const groups = NOZZLE_GROUPS.map((part) => {
    const own = idsOf(part).map((id) => frames[id]);
    const group = buildGroup(context, part, own);
    const holder = new Group();
    holder.add(...own, group.body, group.frost, group.cones);
    object.add(holder);
    showFiring(group, 0);
    return group;
  });
  const labels = new Map<PartId, Object3D>(
    NOZZLE_GROUPS.map((part) => {
      const id = LABELLED[part];
      return [part, anchorAt(frames[id], 0, nozzleReach(id) - BELL_LENGTH / 2, 0)];
    }),
  );
  return {
    object,
    labels,
    mouth: (id) => mouths[id],
    setState(state) {
      for (let index = 0; index < groups.length; index += 1) {
        const group = groups[index];
        const mask = firingMask(group, state);
        if (mask !== group.firing) showFiring(group, mask);
        group.cones.visible = state.view.nozzles;
      }
    },
  };
}
