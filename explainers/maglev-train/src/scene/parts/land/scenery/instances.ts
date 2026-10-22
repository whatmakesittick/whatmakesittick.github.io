import { Color, Matrix4, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { LINE_GROUP, instancesOf } from '../../context';
import type { PartContext } from '../../context';
import { between } from '../random';
import type { Random, Range } from '../random';

type Triple = readonly [number, number, number];

export interface Instance {
  readonly position: Triple;
  readonly turn: number;
  readonly scale: Triple;
  readonly colour: Color;
}

export function vertexFinish(roughness: number, metalness = 0): MaterialFinish {
  return { vertexColors: true, roughness, metalness };
}

export function tinted(hex: string, random: Random, lightness: Range): Color {
  return new Color(hex).multiplyScalar(between(random, lightness));
}

export function placement(position: Triple, turn: number, scale: Triple): Matrix4 {
  return new Matrix4()
    .makeRotationY(turn)
    .scale(new Vector3(...scale))
    .setPosition(...position);
}

export function instanced(
  context: PartContext,
  geometry: BufferGeometry,
  finish: MaterialFinish,
  instances: readonly Instance[],
  name: string,
): InstancedMesh {
  const mesh = instancesOf(
    context,
    geometry,
    context.materials.get(LINE_GROUP, finish),
    instances.map(({ position, turn, scale }) => placement(position, turn, scale)),
  );
  mesh.name = name;
  instances.forEach((instance, index) => mesh.setColorAt(index, instance.colour));
  return mesh;
}
