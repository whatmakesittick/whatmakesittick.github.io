import { Matrix4, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { Figure } from '@core/figure';

const AXES = 3;
const MATRIX = 9;

export class RestFrame {
  private readonly figure: Figure;
  private readonly positions: Float32Array;
  private readonly matrices: Float64Array;
  private readonly scales: Float32Array;

  constructor(figure: Figure) {
    this.figure = figure;
    figure.solveSkeleton(figure.createParameters());
    this.positions = figure.jointPositions.slice();
    this.matrices = figure.jointMatrices.slice();
    this.scales = figure.jointScales.slice();
  }

  joint(name: string, out = new Vector3()): Vector3 {
    return out.fromArray(this.positions, this.figure.jointIndex(name) * AXES);
  }

  jointMatrix(name: string, out = new Matrix4()): Matrix4 {
    const joint = this.figure.jointIndex(name);
    return writeJointMatrix(out, this.matrices, this.positions, this.scales, joint);
  }
}

export function posedJointMatrix(figure: Figure, name: string, out: Matrix4): Matrix4 {
  const joint = figure.jointIndex(name);
  return writeJointMatrix(
    out,
    figure.jointMatrices,
    figure.jointPositions,
    figure.jointScales,
    joint,
  );
}

export function attachToJoint(
  figure: Figure,
  frame: RestFrame,
  jointName: string,
  object: Object3D,
  toRig: Matrix4 = new Matrix4(),
): () => void {
  const restInverse = frame.jointMatrix(jointName).invert();
  const posed = new Matrix4();
  object.matrixAutoUpdate = false;
  const update = (): void => {
    posedJointMatrix(figure, jointName, posed).multiply(restInverse);
    object.matrix.copy(toRig).multiply(posed);
    object.matrixWorldNeedsUpdate = true;
  };
  update();
  return update;
}

function writeJointMatrix(
  out: Matrix4,
  matrices: ArrayLike<number>,
  positions: ArrayLike<number>,
  scales: ArrayLike<number>,
  joint: number,
): Matrix4 {
  const m = joint * MATRIX;
  const p = joint * AXES;
  const s = scales[joint];
  return out.set(
    s * matrices[m],
    s * matrices[m + 1],
    s * matrices[m + 2],
    positions[p],
    s * matrices[m + 3],
    s * matrices[m + 4],
    s * matrices[m + 5],
    positions[p + 1],
    s * matrices[m + 6],
    s * matrices[m + 7],
    s * matrices[m + 8],
    positions[p + 2],
    0,
    0,
    0,
    1,
  );
}
