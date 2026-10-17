import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import { CORNER_NOZZLE_IDS, NOZZLE_IDS, NOZZLE_PARTS } from '../../../ids';
import type { AssemblyState, NozzleId, NozzlePartId, NozzleThrusts } from '../../../ids';
import { NOZZLES, runAt, tankAt } from '../../../model';
import { CONE } from '../../geometry/gear/nozzle';
import type { PartContext } from '../context';
import { BODY } from './dimensions';
import { duskEnvironment } from '../../environment';
import { CONE_FINISHES, GEAR_FINISHES, reflectiveFinishes } from './gearFinishes';
import { createNozzles } from './nozzles';

const GROUPS: readonly NozzlePartId[] = ['cornerNozzles', 'frontNozzles', 'rearNozzles'];

function context(): PartContext {
  return {
    materials: new MaterialLibrary(),
    textures: {} as unknown as SceneTextures,
    tracker: new ResourceTracker(),
  };
}

function thrusts(firing: readonly NozzleId[]): NozzleThrusts {
  return Object.fromEntries(
    NOZZLE_IDS.map((id) => [id, firing.includes(id) ? 1 : 0]),
  ) as NozzleThrusts;
}

function stateWith(firing: readonly NozzleId[], showNozzles: boolean): AssemblyState {
  const { car, fans } = runAt(0);
  return {
    phase: 0,
    playing: false,
    gas: 'air',
    tankLitres: 600,
    car,
    nozzles: thrusts(firing),
    tank: tankAt(0, 'air', 600),
    fans,
    view: { nozzles: showNozzles, forces: false, tank: false, ghost: true, labels: true },
  };
}

function worldAxis(object: Object3D): Vector3 {
  object.updateWorldMatrix(true, false);
  return new Vector3(0, 1, 0).applyQuaternion(object.getWorldQuaternion(new Quaternion()));
}

function bodyFinish(parts: PartContext): MaterialFinish {
  return reflectiveFinishes(duskEnvironment(parts.tracker)).nozzleBody;
}

function idsOf(part: NozzlePartId): NozzleId[] {
  return NOZZLE_IDS.filter((id) => NOZZLE_PARTS[id] === part);
}

function meshOf(parts: PartContext, root: Object3D, part: NozzlePartId, finish: MaterialFinish) {
  const material = parts.materials.get(part, finish);
  let found: InstancedMesh | undefined;
  root.traverse((node) => {
    if (node instanceof InstancedMesh && node.material === material) found = node;
  });
  if (!found) throw new Error(`Missing ${part} mesh`);
  return found;
}

function at(mesh: InstancedMesh, index: number, local = new Vector3()): Vector3 {
  const matrix = new Matrix4();
  mesh.getMatrixAt(index, matrix);
  return local.applyMatrix4(matrix);
}

describe('nozzles', () => {
  it('points every mouth along its nozzle direction and names it by nozzle', () => {
    const set = createNozzles(context());
    NOZZLE_IDS.forEach((id) => {
      const axis = worldAxis(set.mouth(id));
      expect(axis.distanceTo(new Vector3(...NOZZLES[id].dir))).toBeLessThan(1e-6);
      expect(set.object.getObjectByName(id)).toBe(set.mouth(id));
    });
  });

  it('opens the corner nozzles below the body underside', () => {
    const set = createNozzles(context());
    CORNER_NOZZLE_IDS.forEach((id) => {
      expect(set.mouth(id).getWorldPosition(new Vector3()).y).toBeLessThan(BODY.floorY);
    });
  });

  it('draws a group with one body, one frost and one cone mesh', () => {
    const parts = context();
    const set = createNozzles(parts);
    let meshes = 0;
    set.object.traverse((node) => {
      if (!(node instanceof InstancedMesh)) return;
      meshes += 1;
      expect(GROUPS).toContain(parts.materials.groupOf(node.material as never));
    });
    expect(meshes).toBe(GROUPS.length * 3);
    GROUPS.forEach((part) => {
      const body = meshOf(parts, set.object, part, bodyFinish(parts));
      idsOf(part).forEach((id, index) =>
        expect(at(body, index).distanceTo(new Vector3(...NOZZLES[id].at))).toBeLessThan(1e-6),
      );
    });
  });

  it('frosts only the bells that fire', () => {
    const parts = context();
    const set = createNozzles(parts);
    const body = meshOf(parts, set.object, 'rearNozzles', bodyFinish(parts));
    const frost = meshOf(parts, set.object, 'rearNozzles', GEAR_FINISHES.frost);
    set.setState(stateWith([], false));
    expect([body.count, frost.count, frost.visible]).toEqual([4, 0, false]);
    set.setState(stateWith(['rearInnerLeft'], false));
    expect([body.count, frost.count, frost.visible]).toEqual([3, 1, true]);
    const lit = new Vector3(...NOZZLES.rearInnerLeft.at);
    expect(at(frost, 0).distanceTo(lit)).toBeLessThan(1e-6);
  });

  it('shows a direction cone per nozzle only in the nozzle view', () => {
    const parts = context();
    const set = createNozzles(parts);
    const cones = GROUPS.map((part) => meshOf(parts, set.object, part, CONE_FINISHES[part]));
    set.setState(stateWith([], false));
    cones.forEach((mesh) => expect(mesh.visible).toBe(false));
    set.setState(stateWith([], true));
    GROUPS.forEach((part, group) => {
      const mesh = cones[group];
      expect(mesh.visible).toBe(true);
      idsOf(part).forEach((id, index) => {
        const base = at(mesh, index);
        const tip = at(mesh, index, new Vector3(0, CONE.length + CONE.gap, 0));
        const mouth = set.mouth(id).getWorldPosition(new Vector3());
        expect(base.distanceTo(mouth)).toBeLessThan(1e-6);
        expect(
          tip
            .sub(base)
            .normalize()
            .distanceTo(new Vector3(...NOZZLES[id].dir)),
        ).toBeLessThan(1e-6);
      });
    });
  });

  it('puts one label anchor per nozzle group', () => {
    const set = createNozzles(context());
    expect([...set.labels.keys()].sort()).toEqual([...GROUPS]);
  });
});
