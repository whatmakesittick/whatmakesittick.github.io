import { JOINT_PARAMETERS } from './model';
import type { FigureModel } from './model';

const ROTATE_X = 3;
const ROLL_JOINTS = ['r_uparm', 'l_uparm'] as const;

export function rollParameter(joint: string): string {
  return `${joint}_roll`;
}

export function withRolls(model: FigureModel): FigureModel {
  const { rows, columns, values } = model.transform;
  const first = model.parameterNames.length;
  const joints = ROLL_JOINTS.map((name) => model.jointNames.indexOf(name));
  return {
    ...model,
    parameterNames: [...model.parameterNames, ...ROLL_JOINTS.map(rollParameter)],
    transform: {
      ...model.transform,
      rows: Uint16Array.of(...rows, ...joints.map((joint) => joint * JOINT_PARAMETERS + ROTATE_X)),
      columns: Uint16Array.of(...columns, ...joints.map((_, i) => first + i)),
      values: Float32Array.of(...values, ...joints.map(() => 1)),
    },
  };
}
