import { describe, expect, it } from 'vitest';
import { Mesh, Quaternion, Vector3 } from 'three';
import type { MeshStandardMaterial, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import { CORNER_NOZZLE_IDS, NOZZLE_IDS, NOZZLE_PARTS } from '../../../ids';
import type { AssemblyState, NozzleId, NozzleThrusts } from '../../../ids';
import { NOZZLES, runAt, tankAt } from '../../../model';
import { CONE } from '../../geometry/gear/nozzle';
import type { PartContext } from '../context';
import { BODY } from './dimensions';
import { createNozzles } from './nozzles';

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

function bell(root: Object3D, id: NozzleId): Mesh {
  const found = root.getObjectByName(id);
  if (!(found instanceof Mesh)) throw new Error(`Missing bell ${id}`);
  return found;
}

function cone(set: ReturnType<typeof createNozzles>, id: NozzleId): Mesh {
  const found = set.mouth(id).children.find((child) => child instanceof Mesh);
  if (!found) throw new Error(`Missing cone ${id}`);
  return found as Mesh;
}

describe('nozzles', () => {
  it('points every mouth along its nozzle direction', () => {
    const set = createNozzles(context());
    NOZZLE_IDS.forEach((id) => {
      const axis = worldAxis(set.mouth(id));
      const dir = new Vector3(...NOZZLES[id].dir);
      expect(axis.distanceTo(dir)).toBeLessThan(1e-6);
    });
  });

  it('opens the corner nozzles below the body underside', () => {
    const set = createNozzles(context());
    CORNER_NOZZLE_IDS.forEach((id) => {
      expect(set.mouth(id).getWorldPosition(new Vector3()).y).toBeLessThan(BODY.floorY);
    });
  });

  it('names each bell and draws it with its group material', () => {
    const parts = context();
    const set = createNozzles(parts);
    NOZZLE_IDS.forEach((id) => {
      const material = bell(set.object, id).material as MeshStandardMaterial;
      expect(parts.materials.groupOf(material)).toBe(NOZZLE_PARTS[id]);
    });
  });

  it('frosts only the bells that fire', () => {
    const set = createNozzles(context());
    set.setState(stateWith([], false));
    const idle = bell(set.object, 'rearInnerLeft').material;
    set.setState(stateWith(['rearInnerLeft'], false));
    expect(bell(set.object, 'rearInnerLeft').material).not.toBe(idle);
    expect(bell(set.object, 'rearInnerRight').material).toBe(idle);
  });

  it('shows a direction cone per nozzle only in the nozzle view', () => {
    const set = createNozzles(context());
    set.setState(stateWith([], false));
    NOZZLE_IDS.forEach((id) => expect(isShown(cone(set, id))).toBe(false));
    set.setState(stateWith([], true));
    NOZZLE_IDS.forEach((id) => {
      const shape = cone(set, id);
      expect(isShown(shape)).toBe(true);
      shape.geometry.computeBoundingBox();
      const tip = shape.geometry.boundingBox?.max.y ?? 0;
      expect(tip).toBeCloseTo(CONE.length + CONE.gap);
      const tipWorld = shape.localToWorld(new Vector3(0, tip, 0));
      const base = set.mouth(id).getWorldPosition(new Vector3());
      const along = tipWorld.sub(base).normalize();
      expect(along.distanceTo(new Vector3(...NOZZLES[id].dir))).toBeLessThan(1e-6);
    });
  });

  it('puts one label anchor per nozzle group', () => {
    const set = createNozzles(context());
    expect([...set.labels.keys()].sort()).toEqual(['cornerNozzles', 'frontNozzles', 'rearNozzles']);
  });
});
