import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import type { Material, Mesh } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import { CAR_ANCHOR_IDS, NOZZLE_IDS } from '../../../ids';
import type { AssemblyState, PartId } from '../../../ids';
import { CAR_ANCHORS, runAt, tankAt } from '../../../model';
import type { PartContext } from '../context';
import { BODY } from './dimensions';
import { CarPart } from './car';

const LABELS: readonly PartId[] = [
  'body',
  'seat',
  'wheels',
  'tank',
  'tankValve',
  'cornerNozzles',
  'frontNozzles',
  'rearNozzles',
];
const MIRROR_REACH = 0.15;
const GHOST_OPACITY_LIMIT = 0.2;

function context(): PartContext {
  return {
    materials: new MaterialLibrary(),
    textures: {} as unknown as SceneTextures,
    tracker: new ResourceTracker(),
  };
}

function stateWith(cutaway: boolean): AssemblyState {
  const { car, nozzles, fans } = runAt(0);
  return {
    phase: 0,
    playing: false,
    gas: 'air',
    tankLitres: 600,
    car,
    nozzles,
    tank: tankAt(0, 'air', 600),
    fans,
    view: { nozzles: false, forces: false, tank: cutaway, ghost: true, labels: true },
  };
}

function ghostMeshes(part: CarPart): Mesh[] {
  const meshes: Mesh[] = [];
  part.object.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as Material;
    if (material.transparent && material.opacity < GHOST_OPACITY_LIMIT) meshes.push(mesh);
  });
  return meshes;
}

describe('CarPart', () => {
  it('labels the body, seat and every unit it composes', () => {
    const part = new CarPart(context());
    LABELS.forEach((id) => expect(part.labels.get(id)).toBeDefined());
  });

  it('places the car anchors and reaches every nozzle mouth', () => {
    const part = new CarPart(context());
    CAR_ANCHOR_IDS.forEach((id) =>
      expect(part.anchors[id].position.toArray()).toEqual([...CAR_ANCHORS[id]]),
    );
    NOZZLE_IDS.forEach((id) => expect(part.nozzle(id)).toBeDefined());
  });

  it('turns the roof, right door and right window to ghosts for the tank view', () => {
    const part = new CarPart(context());
    part.setState(stateWith(false));
    const before = ghostMeshes(part).length;
    part.setState(stateWith(true));
    expect(ghostMeshes(part).length - before).toBe(3);
    part.setState(stateWith(false));
    expect(ghostMeshes(part).length).toBe(before);
  });

  it('builds one shared silhouette inside the car outline', () => {
    const part = new CarPart(context());
    const outline = part.silhouette();
    expect(part.silhouette()).toBe(outline);
    const bounds = new Box3().setFromBufferAttribute(outline.getAttribute('position') as never);
    const size = bounds.getSize(new Vector3());
    expect(size.x).toBeLessThan(2 * BODY.halfLength + MIRROR_REACH);
    expect(size.z).toBeLessThan(2 * BODY.halfWidth + 2 * MIRROR_REACH);
    expect(bounds.max.y).toBeLessThan(BODY.roofY + MIRROR_REACH);
  });
});
