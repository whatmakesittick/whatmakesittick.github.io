import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AssemblyState } from '../../../ids';
import { runAt, tankAt } from '../../../model';
import { CALIPER } from '../../geometry/gear/brake';
import type { PartContext } from '../context';
import { WHEEL, WHEEL_CENTRES } from './dimensions';
import { BLUR_FROM_SPEED_MS, createWheels, wheelTurn } from './wheels';
import type { WheelSet } from './wheels';

const WHEEL_TRIANGLE_LIMIT = 2500;
const SPINNER_COUNT = 5;

function context(): PartContext {
  return {
    materials: new MaterialLibrary(),
    textures: {} as unknown as SceneTextures,
    tracker: new ResourceTracker(),
  };
}

function stateWith(x: number, speed: number): AssemblyState {
  const { car, nozzles, fans } = runAt(0);
  return {
    phase: 0,
    playing: false,
    gas: 'air',
    tankLitres: 600,
    car: { ...car, position: [x, 0, 0], speed },
    nozzles,
    tank: tankAt(0, 'air', 600),
    fans,
    view: { nozzles: false, forces: false, tank: false, ghost: true, labels: true },
  };
}

function instancedMeshes(wheels: WheelSet): InstancedMesh[] {
  return wheels.object.children.filter(
    (child): child is InstancedMesh => child instanceof InstancedMesh,
  );
}

function pose(mesh: InstancedMesh, index: number): Matrix4 {
  const matrix = new Matrix4();
  mesh.getMatrixAt(index, matrix);
  return matrix;
}

function moved(mesh: InstancedMesh, index: number, local: Vector3): Vector3 {
  return local
    .clone()
    .applyMatrix4(pose(mesh, index))
    .sub(new Vector3(...WHEEL_CENTRES[index]));
}

function triangles(mesh: Mesh): number {
  const { geometry } = mesh;
  return (geometry.index ? geometry.index.count : geometry.getAttribute('position').count) / 3;
}

describe('wheels', () => {
  it('draws each wheel piece once for all four wheels', () => {
    const meshes = instancedMeshes(createWheels(context()));
    expect(meshes).toHaveLength(SPINNER_COUNT + 1);
    meshes.forEach((mesh) => expect(mesh.count).toBe(WHEEL_CENTRES.length));
    expect(meshes.filter((mesh) => mesh.visible)).toHaveLength(SPINNER_COUNT);
  });

  it('puts a wheel at every centre with the outboard face out', () => {
    const [tyre] = instancedMeshes(createWheels(context()));
    WHEEL_CENTRES.forEach((centre, index) => {
      const at = new Vector3().setFromMatrixPosition(pose(tyre, index));
      expect(at.distanceTo(new Vector3(...centre))).toBeLessThan(1e-6);
      const outboard = new Vector3(0, 0, 1).transformDirection(pose(tyre, index));
      expect(Math.sign(outboard.z)).toBe(Math.sign(centre[2]));
    });
  });

  it('rolls every tyre toward the nose as the car moves forward', () => {
    expect(wheelTurn(2 * Math.PI * WHEEL.radius)).toBeCloseTo(-2 * Math.PI);
    const wheels = createWheels(context());
    wheels.setState(stateWith(0.05, 1));
    const [tyre] = instancedMeshes(wheels);
    WHEEL_CENTRES.forEach((_, index) => {
      expect(moved(tyre, index, new Vector3(0, WHEEL.radius, 0)).x).toBeGreaterThan(0);
      expect(moved(tyre, index, new Vector3(0, -WHEEL.radius, 0)).x).toBeLessThan(0);
    });
  });

  it('turns every wheel by the distance driven', () => {
    const wheels = createWheels(context());
    wheels.setState(stateWith(1.7, 2));
    const turn = wheelTurn(1.7);
    const expected = new Vector3(-Math.sin(turn), Math.cos(turn), 0).multiplyScalar(WHEEL.radius);
    instancedMeshes(wheels)
      .slice(0, SPINNER_COUNT)
      .forEach((mesh) =>
        WHEEL_CENTRES.forEach((centre, index) => {
          const top = new Vector3(0, WHEEL.radius, 0).applyMatrix4(pose(mesh, index));
          expect(top.sub(new Vector3(...centre)).distanceTo(expected)).toBeLessThan(1e-5);
        }),
      );
  });

  it('keeps every caliper still at the upper rear of its disc', () => {
    const wheels = createWheels(context());
    const caliper = instancedMeshes(wheels)[SPINNER_COUNT];
    const middle = (CALIPER.inner + CALIPER.outer) / 2;
    const local = new Vector3(Math.cos(CALIPER.angle), Math.sin(CALIPER.angle), 0).multiplyScalar(
      middle,
    );
    const before = WHEEL_CENTRES.map((_, index) => moved(caliper, index, local));
    wheels.setState(stateWith(3, 2));
    before.forEach((offset, index) => {
      expect(offset.x).toBeLessThan(0);
      expect(offset.y).toBeGreaterThan(0);
      expect(moved(caliper, index, local).distanceTo(offset)).toBeLessThan(1e-6);
    });
  });

  it('swaps the spokes for a blurred disc above the blur speed', () => {
    const wheels = createWheels(context());
    const shown = () => instancedMeshes(wheels).map((mesh) => mesh.visible);
    wheels.setState(stateWith(0, BLUR_FROM_SPEED_MS - 1));
    const sharp = shown();
    wheels.setState(stateWith(0, BLUR_FROM_SPEED_MS + 1));
    const changed = shown().filter((visible, index) => visible !== sharp[index]);
    expect(changed).toHaveLength(2);
  });

  it('keeps a wheel under the triangle budget', () => {
    const total = instancedMeshes(createWheels(context())).reduce(
      (sum, mesh) => sum + triangles(mesh),
      0,
    );
    expect(total).toBeLessThan(WHEEL_TRIANGLE_LIMIT);
  });

  it('draws every mesh with a wheels material and anchors the label on the part', () => {
    const parts = context();
    const wheels = createWheels(parts);
    wheels.object.traverse((node) => {
      if (node instanceof Mesh) expect(parts.materials.groupOf(node.material)).toBe('wheels');
    });
    let root: Object3D | null = wheels.label;
    while (root?.parent) root = root.parent;
    expect(root).toBe(wheels.object);
  });
});
