import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Mesh } from 'three';
import type { Material, Matrix4 } from 'three';
import type { Figure } from '@core/figure';
import { partitionTriangles } from './partition';
import type { AddedVertices } from './partition';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { blendRows, extend, normaliseRows } from './blend';

const AXES = 3;

export type PartRule = readonly [pattern: RegExp, part: string];

export interface StaticAttribute {
  readonly name: string;
  readonly data: Float32Array;
  readonly itemSize: number;
}

export class DeformingMesh extends Mesh {
  // Core builds a static bounds tree for meshes typed 'Mesh'; this one changes shape every pose.
  override readonly type: string = 'DeformingMesh';
}

const MAX_VERTICES = 65536;

export function partsOf(rules: readonly PartRule[]): readonly string[] {
  return [...new Set(rules.map(([, part]) => part)), STRUCTURE_GROUP];
}

function partOfJoint(name: string, rules: readonly PartRule[]): string {
  return rules.find(([pattern]) => pattern.test(name))?.[1] ?? STRUCTURE_GROUP;
}

export function partWeights(figure: Figure, rules: readonly PartRule[]): Float32Array {
  const parts = partsOf(rules);
  const jointPart = Array.from(figure.jointNames, (name) =>
    parts.indexOf(partOfJoint(name, rules)),
  );
  const { start, joints, weights } = figure.skin;
  const sums = new Float32Array(figure.vertexCount * parts.length);
  for (let v = 0; v < figure.vertexCount; v++) {
    for (let i = start[v]; i < start[v + 1]; i++) {
      sums[v * parts.length + jointPart[joints[i]]] += weights[i];
    }
  }
  return sums;
}

export interface FigureBodyParts {
  readonly figure: Figure;
  readonly materialOf: (part: string) => Material;
  readonly track: <T extends { dispose(): void }>(item: T) => T;
  readonly toRig: Matrix4;
  readonly partRules: readonly PartRule[];
  readonly attributes: readonly StaticAttribute[];
}

export class FigureBody {
  readonly mesh: Mesh;
  private readonly figure: Figure;
  private readonly added: AddedVertices;
  private readonly geometry: BufferGeometry;
  private readonly position: BufferAttribute;
  private readonly normal: BufferAttribute;

  constructor(parts: FigureBodyParts) {
    const { figure } = parts;
    const names = partsOf(parts.partRules);
    this.figure = figure;
    const split = partitionTriangles(
      figure.indices,
      figure.vertexCount,
      partWeights(figure, parts.partRules),
      names.length,
    );
    this.added = split.added;
    const total = figure.vertexCount + this.added.count;
    if (total >= MAX_VERTICES) throw new Error(`Body needs ${total} vertices, limit is 65535`);
    this.position = new BufferAttribute(new Float32Array(total * AXES), AXES).setUsage(
      DynamicDrawUsage,
    );
    this.normal = new BufferAttribute(new Float32Array(total * AXES), AXES).setUsage(
      DynamicDrawUsage,
    );
    this.geometry = parts.track(new BufferGeometry());
    this.geometry.setIndex(new BufferAttribute(Uint16Array.from(split.indices), 1));
    this.geometry.setAttribute('position', this.position);
    this.geometry.setAttribute('normal', this.normal);
    parts.attributes.forEach((attribute) => this.addStatic(attribute));
    split.ranges.forEach((range, index) => this.geometry.addGroup(range.start, range.count, index));
    this.mesh = new DeformingMesh(
      this.geometry,
      split.ranges.map((range) => parts.materialOf(names[range.part])),
    );
    this.mesh.name = 'body';
    this.mesh.matrixAutoUpdate = false;
    this.mesh.matrix.copy(parts.toRig);
    this.update();
  }

  update(): void {
    const { figure, added } = this;
    const positions = this.position.array as Float32Array;
    const normals = this.normal.array as Float32Array;
    positions.set(figure.positions);
    normals.set(figure.normals);
    blendRows(positions, AXES, figure.vertexCount, added);
    blendRows(normals, AXES, figure.vertexCount, added);
    normaliseRows(normals, figure.vertexCount, figure.vertexCount + added.count);
    this.position.needsUpdate = true;
    this.normal.needsUpdate = true;
    this.geometry.computeBoundingSphere();
    this.geometry.computeBoundingBox();
  }

  private addStatic({ name, data, itemSize }: StaticAttribute): void {
    const extended = extend(data, itemSize, this.figure.vertexCount, this.added);
    this.geometry.setAttribute(name, new BufferAttribute(extended, itemSize));
  }
}
