import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Mesh } from 'three';
import type { Material, Matrix4 } from 'three';
import type { Figure } from '@core/figure';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { GARMENT_ATTRIBUTES } from './garments/garmentShader';
import { CHANNELS } from './garments/regions';
import type { GarmentFields } from './garments/regions';

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

function partOfVertices(figure: Figure): string[] {
  const joints = figure.dominantJoints();
  return Array.from(joints, (joint) => partOfJoint(figure.jointNames[joint]));
}

interface PartRange {
  readonly part: string;
  readonly start: number;
  readonly count: number;
}

function sortByPart(figure: Figure): { indices: Uint16Array; ranges: PartRange[] } {
  const parts = partOfVertices(figure);
  const order = Array.from(new Set(parts));
  const buckets = order.map(() => [] as number[]);
  for (let t = 0; t < figure.triangleCount; t++) {
    const corner = figure.indices[t * AXES];
    buckets[order.indexOf(parts[corner])].push(t);
  }
  const indices = new Uint16Array(figure.indices.length);
  const ranges: PartRange[] = [];
  let at = 0;
  buckets.forEach((triangles, bucket) => {
    const start = at;
    triangles.forEach((t) => {
      indices.set(figure.indices.subarray(t * AXES, t * AXES + AXES), at);
      at += AXES;
    });
    ranges.push({ part: order[bucket], start, count: at - start });
  });
  return { indices, ranges };
}

export interface FigureBodyParts {
  readonly figure: Figure;
  readonly materialOf: (part: string) => Material;
  readonly track: <T extends { dispose(): void }>(item: T) => T;
  readonly toRig: Matrix4;
  readonly garments: GarmentFields;
}

export class FigureBody {
  readonly mesh: Mesh;
  private readonly geometry: BufferGeometry;
  private readonly position: BufferAttribute;
  private readonly normal: BufferAttribute;

  constructor(parts: FigureBodyParts) {
    const { indices, ranges } = sortByPart(parts.figure);
    this.position = new BufferAttribute(parts.figure.positions, AXES).setUsage(DynamicDrawUsage);
    this.normal = new BufferAttribute(parts.figure.normals, AXES).setUsage(DynamicDrawUsage);
    this.geometry = parts.track(new BufferGeometry());
    this.geometry.setIndex(new BufferAttribute(indices, 1));
    this.geometry.setAttribute('position', this.position);
    this.geometry.setAttribute('normal', this.normal);
    this.geometry.setAttribute(
      GARMENT_ATTRIBUTES.distances,
      new BufferAttribute(parts.garments.distances, CHANNELS),
    );
    this.geometry.setAttribute(
      GARMENT_ATTRIBUTES.extents,
      new BufferAttribute(parts.garments.extents, CHANNELS),
    );
    ranges.forEach((range, index) => this.geometry.addGroup(range.start, range.count, index));
    this.mesh = new DeformingMesh(
      this.geometry,
      ranges.map((range) => parts.materialOf(range.part)),
    );
    this.mesh.name = 'body';
    this.mesh.matrixAutoUpdate = false;
    this.mesh.matrix.copy(parts.toRig);
    this.update();
  }

  update(): void {
    this.position.needsUpdate = true;
    this.normal.needsUpdate = true;
    this.geometry.computeBoundingSphere();
    this.geometry.computeBoundingBox();
  }
}
