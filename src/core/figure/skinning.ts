import type { Kinematics } from './kinematics';
import { AXES, MATRIX, multiplyInto } from './matrix';
import type { FigureModel } from './model';

const STRIDE = MATRIX + AXES;

export class Skinning {
  private readonly transforms: Float64Array;
  private readonly model: FigureModel;

  constructor(model: FigureModel) {
    this.model = model;
    this.transforms = new Float64Array(model.jointCount * STRIDE);
  }

  update(kinematics: Kinematics): void {
    const { bindRotations, bindTranslations, bindScales } = this.model.skeleton;
    const { rotations, translations, scales } = kinematics;
    for (let joint = 0; joint < this.model.jointCount; joint++) {
      const at = joint * STRIDE;
      multiplyInto(this.transforms, at, rotations, joint * MATRIX, bindRotations, joint * MATRIX);
      const scale = scales[joint] * bindScales[joint];
      for (let i = 0; i < MATRIX; i++) this.transforms[at + i] *= scale;
      for (let a = 0; a < AXES; a++) {
        const r = joint * MATRIX + a * AXES;
        this.transforms[at + MATRIX + a] =
          translations[joint * AXES + a] +
          scales[joint] *
            (rotations[r] * bindTranslations[joint * AXES] +
              rotations[r + 1] * bindTranslations[joint * AXES + 1] +
              rotations[r + 2] * bindTranslations[joint * AXES + 2]);
      }
    }
  }

  apply(source: Float32Array, target: Float32Array): void {
    const { start, joints, weights } = this.model.skin;
    const m = this.transforms;
    for (let v = 0; v < this.model.vertexCount; v++) {
      const x = source[v * AXES];
      const y = source[v * AXES + 1];
      const z = source[v * AXES + 2];
      let ox = 0;
      let oy = 0;
      let oz = 0;
      for (let i = start[v]; i < start[v + 1]; i++) {
        const at = joints[i] * STRIDE;
        const w = weights[i];
        ox += w * (m[at] * x + m[at + 1] * y + m[at + 2] * z + m[at + 9]);
        oy += w * (m[at + 3] * x + m[at + 4] * y + m[at + 5] * z + m[at + 10]);
        oz += w * (m[at + 6] * x + m[at + 7] * y + m[at + 8] * z + m[at + 11]);
      }
      target[v * AXES] = ox;
      target[v * AXES + 1] = oy;
      target[v * AXES + 2] = oz;
    }
  }
}
