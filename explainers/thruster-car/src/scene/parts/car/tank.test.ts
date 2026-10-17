import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import type { Mesh, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AssemblyState } from '../../../ids';
import { TANK, runAt, tankAt } from '../../../model';
import { CORE_LENGTH } from '../../geometry/gear/tank';
import type { PartContext } from '../context';
import { CORE_NAME, coreLength, createTank } from './tank';

function context(): PartContext {
  return {
    materials: new MaterialLibrary(),
    textures: {} as unknown as SceneTextures,
    tracker: new ResourceTracker(),
  };
}

function stateWith(massShare: number, cutaway: boolean, empty = false): AssemblyState {
  const { car, nozzles, fans } = runAt(0);
  return {
    phase: 0,
    playing: false,
    gas: 'air',
    tankLitres: 600,
    car,
    nozzles,
    tank: { ...tankAt(0, 'air', 600), massShare, empty },
    fans,
    view: { nozzles: false, forces: false, tank: cutaway, ghost: true, labels: true },
  };
}

function coreOf(root: Object3D): Mesh {
  const core = root.getObjectByName(CORE_NAME);
  if (!core) throw new Error('Missing gas core');
  return core as Mesh;
}

function coreBox(root: Object3D): Box3 {
  root.updateMatrixWorld(true);
  return new Box3().setFromObject(coreOf(root));
}

describe('tank', () => {
  it('fills the gas core from the front end by the mass share', () => {
    const tank = createTank(context());
    tank.setState(stateWith(1, true));
    const full = coreBox(tank.object);
    tank.setState(stateWith(0.4, true));
    const partial = coreBox(tank.object);
    expect(full.max.x - full.min.x).toBeCloseTo(CORE_LENGTH);
    expect(partial.max.x - partial.min.x).toBeCloseTo(0.4 * CORE_LENGTH);
    expect(partial.max.x).toBeCloseTo(full.max.x);
    expect(full.max.x).toBeLessThan(TANK.centre[0] + TANK.length / 2);
    expect(full.min.x).toBeGreaterThan(TANK.centre[0] - TANK.length / 2);
  });

  it('clamps the core length to the tank', () => {
    expect(coreLength(-0.2)).toBe(0);
    expect(coreLength(1.4)).toBeCloseTo(CORE_LENGTH);
  });

  it('shows the core through the cut shell only in the tank view', () => {
    const tank = createTank(context());
    const shells = () => tank.object.children[0].children.slice(0, 2);
    tank.setState(stateWith(0.6, false));
    expect(isShown(coreOf(tank.object))).toBe(false);
    expect(shells().map((shell) => shell.visible)).toEqual([true, false]);
    tank.setState(stateWith(0.6, true));
    expect(isShown(coreOf(tank.object))).toBe(true);
    expect(shells().map((shell) => shell.visible)).toEqual([false, true]);
  });

  it('tints the core with the empty material once the tank runs dry', () => {
    const parts = context();
    const tank = createTank(parts);
    tank.setState(stateWith(0.6, true));
    const full = coreOf(tank.object).material;
    tank.setState(stateWith(0.05, true, true));
    const dry = coreOf(tank.object).material;
    expect(dry).not.toBe(full);
    expect(parts.materials.groupOf(dry as never)).toBe('tank');
  });

  it('anchors the tank and the valve labels on their own parts', () => {
    const tank = createTank(context());
    expect([...tank.labels.keys()]).toEqual(['tank', 'tankValve']);
    const valve = tank.labels.get('tankValve')?.getWorldPosition(new Vector3());
    expect(valve?.x).toBeLessThan(TANK.centre[0] - TANK.length / 2);
  });
});
