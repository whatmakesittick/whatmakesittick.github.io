import { describe, expect, it } from 'vitest';
import { Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { AssemblyState } from '../../../ids';
import { runAt, tankAt } from '../../../model';
import type { PartContext } from '../context';
import { WHEEL, WHEEL_CENTRES } from './dimensions';
import { BLUR_FROM_SPEED_MS, createWheels, wheelTurn } from './wheels';

const WHEEL_TRIANGLE_LIMIT = 2500;

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

function triangles(object: Object3D): number {
  let count = 0;
  object.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const geometry = node.geometry;
    count += (geometry.index ? geometry.index.count : geometry.getAttribute('position').count) / 3;
  });
  return count;
}

describe('wheels', () => {
  it('puts a wheel at every centre and mirrors the left side', () => {
    const wheels = createWheels(context());
    const placed = wheels.object.children.map((wheel) => wheel.position.toArray());
    expect(placed).toEqual(WHEEL_CENTRES.map((centre) => [...centre]));
    wheels.object.children.forEach((wheel) =>
      expect(wheel.scale.z).toBe(Math.sign(wheel.position.z)),
    );
  });

  it('rolls the tyre toward the nose as the car moves forward', () => {
    const top = new Vector3(0, WHEEL.radius, 0).applyAxisAngle(
      new Vector3(0, 0, 1),
      wheelTurn(0.05),
    );
    const contact = new Vector3(0, -WHEEL.radius, 0).applyAxisAngle(
      new Vector3(0, 0, 1),
      wheelTurn(0.05),
    );
    expect(top.x).toBeGreaterThan(0);
    expect(contact.x).toBeLessThan(0);
    expect(wheelTurn(2 * Math.PI * WHEEL.radius)).toBeCloseTo(-2 * Math.PI);
  });

  it('turns every spinner by the distance driven', () => {
    const wheels = createWheels(context());
    wheels.setState(stateWith(1.7, 2));
    wheels.object.children.forEach((wheel) =>
      expect(wheel.children[0].rotation.z).toBeCloseTo(wheelTurn(1.7)),
    );
  });

  it('swaps the spokes for a blurred disc above the blur speed', () => {
    const wheels = createWheels(context());
    const meshes = () => wheels.object.children[0].children[0].children as Mesh[];
    wheels.setState(stateWith(0, BLUR_FROM_SPEED_MS - 1));
    expect(meshes().filter((mesh) => mesh.visible)).toHaveLength(meshes().length - 1);
    const sharp = meshes().map((mesh) => mesh.visible);
    wheels.setState(stateWith(0, BLUR_FROM_SPEED_MS + 1));
    const blurred = meshes().map((mesh) => mesh.visible);
    expect(blurred.filter((shown, index) => shown !== sharp[index])).toHaveLength(2);
  });

  it('keeps a wheel under the triangle budget', () => {
    const wheels = createWheels(context());
    wheels.object.children.forEach((wheel) =>
      expect(triangles(wheel)).toBeLessThan(WHEEL_TRIANGLE_LIMIT),
    );
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
