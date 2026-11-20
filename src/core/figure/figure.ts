import { Correctives } from './correctives';
import { decodeModel } from './decode';
import type { FigureData } from './data';
import { Kinematics } from './kinematics';
import { AXES, MATRIX, quaternionFromMatrix } from './matrix';
import type { FigureModel, SkeletonModel } from './model';
import { computeNormals } from './normals';
import { Skinning } from './skinning';

const QUATERNION = 4;

export class Figure {
  readonly vertexCount: number;
  readonly triangleCount: number;
  readonly jointCount: number;
  readonly parameterCount: number;
  readonly jointNames: readonly string[];
  readonly parameterNames: readonly string[];
  readonly indices: Uint16Array;
  readonly restPositions: Float32Array;
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly jointPositions: Float32Array;
  readonly jointRotations: Float32Array;
  readonly jointScales: Float32Array;
  readonly skeleton: SkeletonModel;
  private readonly kinematics: Kinematics;
  private readonly skinning: Skinning;
  private readonly correctives: Correctives;
  private readonly deformed: Float32Array;
  private readonly parameterLookup: ReadonlyMap<string, number>;
  private readonly jointLookup: ReadonlyMap<string, number>;
  private readonly model: FigureModel;

  constructor(model: FigureModel) {
    this.model = model;
    this.skeleton = model.skeleton;
    this.vertexCount = model.vertexCount;
    this.triangleCount = model.indices.length / AXES;
    this.jointCount = model.jointCount;
    this.parameterCount = model.parameterNames.length;
    this.jointNames = model.jointNames;
    this.parameterNames = model.parameterNames;
    this.indices = model.indices;
    this.restPositions = model.rest;
    this.positions = new Float32Array(model.rest.length);
    this.normals = new Float32Array(model.rest.length);
    this.jointPositions = new Float32Array(model.jointCount * AXES);
    this.jointRotations = new Float32Array(model.jointCount * QUATERNION);
    this.jointScales = new Float32Array(model.jointCount);
    this.deformed = new Float32Array(model.rest.length);
    this.kinematics = new Kinematics(model);
    this.skinning = new Skinning(model);
    this.correctives = new Correctives(model.correctives);
    this.parameterLookup = indexLookup(model.parameterNames);
    this.jointLookup = indexLookup(model.jointNames);
    this.pose(new Float32Array(this.parameterCount));
  }

  parameterIndex(name: string): number {
    return this.parameterLookup.get(name) ?? -1;
  }

  jointIndex(name: string): number {
    return this.jointLookup.get(name) ?? -1;
  }

  dominantJoints(): Uint8Array {
    const { start, joints, weights } = this.model.skin;
    const dominant = new Uint8Array(this.vertexCount);
    for (let v = 0; v < this.vertexCount; v++) {
      let best = start[v];
      for (let i = start[v] + 1; i < start[v + 1]; i++) if (weights[i] > weights[best]) best = i;
      dominant[v] = joints[best];
    }
    return dominant;
  }

  createParameters(): Float32Array {
    return new Float32Array(this.parameterCount);
  }

  get jointMatrices(): Float64Array {
    return this.kinematics.rotations;
  }

  solveSkeleton(parameters: Float32Array): void {
    this.kinematics.solve(parameters);
    this.publishJoints();
  }

  pose(parameters: Float32Array, correctives = true): void {
    this.kinematics.solve(parameters);
    this.skinning.update(this.kinematics);
    this.deformed.set(this.model.rest);
    if (correctives) this.correctives.apply(this.kinematics.features, this.deformed);
    this.skinning.apply(this.deformed, this.positions);
    computeNormals(this.positions, this.indices, this.normals);
    this.publishJoints();
  }

  private publishJoints(): void {
    const { translations, rotations, scales } = this.kinematics;
    for (let j = 0; j < this.jointCount; j++) {
      for (let a = 0; a < AXES; a++) this.jointPositions[j * AXES + a] = translations[j * AXES + a];
      quaternionFromMatrix(rotations, j * MATRIX, this.jointRotations, j * QUATERNION);
      this.jointScales[j] = scales[j];
    }
  }
}

function indexLookup(names: readonly string[]): Map<string, number> {
  return new Map(names.map((name, index) => [name, index]));
}

export function decodeFigure(data: FigureData): Figure {
  return new Figure(decodeModel(data));
}
