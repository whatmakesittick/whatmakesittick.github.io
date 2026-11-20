import { AXES, MATRIX, eulerInto, multiplyInto } from './matrix';
import type { FigureModel } from './model';

const JOINT_PARAMETERS = 7;
const FIRST_FEATURE_JOINT = 2;
const FEATURES_PER_JOINT = 6;
const LOG2_BASE = 2;

export class Kinematics {
  readonly translations: Float64Array;
  readonly rotations: Float64Array;
  readonly scales: Float64Array;
  readonly features: Float64Array;
  private readonly jointParameters: Float64Array;
  private readonly euler = new Float64Array(MATRIX);
  private readonly local = new Float64Array(MATRIX);
  private readonly model: FigureModel;

  constructor(model: FigureModel) {
    this.model = model;
    const joints = model.jointCount;
    this.translations = new Float64Array(joints * AXES);
    this.rotations = new Float64Array(joints * MATRIX);
    this.scales = new Float64Array(joints);
    this.features = new Float64Array((joints - FIRST_FEATURE_JOINT) * FEATURES_PER_JOINT);
    this.jointParameters = new Float64Array(joints * JOINT_PARAMETERS);
  }

  solve(parameters: Float32Array): void {
    this.fillJointParameters(parameters);
    for (let joint = 0; joint < this.model.jointCount; joint++) this.solveJoint(joint);
  }

  private fillJointParameters(parameters: Float32Array): void {
    const { rows, columns, values, baked } = this.model.transform;
    this.jointParameters.set(baked);
    for (let i = 0; i < rows.length; i++)
      this.jointParameters[rows[i]] += values[i] * parameters[columns[i]];
  }

  private solveJoint(joint: number): void {
    const p = this.jointParameters;
    const base = joint * JOINT_PARAMETERS;
    eulerInto(this.euler, 0, p[base + 3], p[base + 4], p[base + 5]);
    if (joint >= FIRST_FEATURE_JOINT) this.writeFeatures(joint);
    multiplyInto(this.local, 0, this.model.skeleton.preRotations, joint * MATRIX, this.euler, 0);
    const scale = Math.pow(LOG2_BASE, p[base + 6]);
    const parent = this.model.skeleton.parents[joint];
    if (parent < 0) this.placeRoot(joint, scale);
    else this.placeChild(joint, parent, scale);
  }

  private writeFeatures(joint: number): void {
    const e = this.euler;
    const at = (joint - FIRST_FEATURE_JOINT) * FEATURES_PER_JOINT;
    this.features[at] = e[0] - 1;
    this.features[at + 1] = e[3];
    this.features[at + 2] = e[6];
    this.features[at + 3] = e[1];
    this.features[at + 4] = e[4] - 1;
    this.features[at + 5] = e[7];
  }

  private localTranslation(joint: number, axis: number): number {
    const base = joint * JOINT_PARAMETERS;
    return this.jointParameters[base + axis] + this.model.skeleton.offsets[joint * AXES + axis];
  }

  private placeRoot(joint: number, scale: number): void {
    for (let a = 0; a < AXES; a++)
      this.translations[joint * AXES + a] = this.localTranslation(joint, a);
    this.rotations.set(this.local, joint * MATRIX);
    this.scales[joint] = scale;
  }

  private placeChild(joint: number, parent: number, scale: number): void {
    const rotations = this.rotations;
    const at = parent * MATRIX;
    const parentScale = this.scales[parent];
    const tx = this.localTranslation(joint, 0);
    const ty = this.localTranslation(joint, 1);
    const tz = this.localTranslation(joint, 2);
    for (let a = 0; a < AXES; a++)
      this.translations[joint * AXES + a] =
        this.translations[parent * AXES + a] +
        parentScale *
          (rotations[at + a * AXES] * tx +
            rotations[at + a * AXES + 1] * ty +
            rotations[at + a * AXES + 2] * tz);
    multiplyInto(rotations, joint * MATRIX, rotations, at, this.local, 0);
    this.scales[joint] = parentScale * scale;
  }
}
