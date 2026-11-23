import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Mesh } from 'three';
import type { Material, Matrix4 } from 'three';
import type { Figure } from '@core/figure';
import { partitionTriangles } from '@core/figure/body/partition';
import type { AddedVertices } from '@core/figure/body/partition';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { GARMENT_ATTRIBUTES } from './garments/garmentShader';
import { blendRows, extend, normaliseRows } from '@core/figure/body/blend';
import { LABEL_ATTRIBUTE, LABEL_CHANNELS } from './garments/label';
import { CHANNELS } from './garments/regions';
import type { GarmentFields } from './garments/regions';
import { TOE_ATTRIBUTE } from './feet/toeShader';
import { TOE_CHANNELS } from './feet/toeFields';

const AXES = 3;
const PART_RULES: readonly (readonly [RegExp, string])[] = [
  [/_(wrist|pinky|ring|middle|index|thumb)/, 'hand'],
  [/_lowarm/, 'forearm'],
  [/_uparm/, 'elbow'],
  [/_clavicle|c_spine[23]/, 'shoulder'],
  [/c_neck|c_head|c_jaw|c_teeth|c_tongue|_eye/, 'head'],
  [/_lowleg|_foot|_ball|_talocrural|_subtalar|_transversetarsal/, 'foot'],
  [/_upleg|^root$/, 'hips'],
];

export class DeformingMesh extends Mesh {
  // Core builds a static bounds tree for meshes typed 'Mesh'; this one changes shape every pose.
  override readonly type: string = 'DeformingMesh';
}

function partOfJoint(name: string): string {
  return PART_RULES.find(([pattern]) => pattern.test(name))?.[1] ?? STRUCTURE_GROUP;
}

const PARTS: readonly string[] = [...new Set(PART_RULES.map(([, part]) => part)), STRUCTURE_GROUP];
const MAX_VERTICES = 65536;

function partWeights(figure: Figure): Float32Array {
  const jointPart = Array.from(figure.jointNames, (name) => PARTS.indexOf(partOfJoint(name)));
  const { start, joints, weights } = figure.skin;
  const sums = new Float32Array(figure.vertexCount * PARTS.length);
  for (let v = 0; v < figure.vertexCount; v++) {
    for (let i = start[v]; i < start[v + 1]; i++) {
      sums[v * PARTS.length + jointPart[joints[i]]] += weights[i];
    }
  }
  return sums;
}

export interface FigureBodyParts {
  readonly figure: Figure;
  readonly materialOf: (part: string) => Material;
  readonly track: <T extends { dispose(): void }>(item: T) => T;
  readonly toRig: Matrix4;
  readonly garments: GarmentFields;
  readonly label: Float32Array;
  readonly toes: Float32Array;
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
    this.figure = figure;
    const split = partitionTriangles(
      figure.indices,
      figure.vertexCount,
      partWeights(figure),
      PARTS.length,
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
    this.addStatic(GARMENT_ATTRIBUTES.distances, parts.garments.distances);
    this.addStatic(GARMENT_ATTRIBUTES.extents, parts.garments.extents);
    this.addStatic(LABEL_ATTRIBUTE, parts.label, LABEL_CHANNELS);
    this.addStatic(TOE_ATTRIBUTE, parts.toes, TOE_CHANNELS);
    split.ranges.forEach((range, index) => this.geometry.addGroup(range.start, range.count, index));
    this.mesh = new DeformingMesh(
      this.geometry,
      split.ranges.map((range) => parts.materialOf(PARTS[range.part])),
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

  private addStatic(name: string, source: Float32Array, itemSize = CHANNELS): void {
    const data = extend(source, itemSize, this.figure.vertexCount, this.added);
    this.geometry.setAttribute(name, new BufferAttribute(data, itemSize));
  }
}
