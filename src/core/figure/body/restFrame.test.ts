import { Group, Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { decodeFigure } from '@core/figure';
import { TEST_BODIES } from '../bodies.testkit';
import { RestFrame, attachToJoint } from './restFrame';

const HEAD_JOINT = 'c_head';
const TOLERANCE = 1e-3;
const HEAD_PARAMETER = 'head_lean';
const PROBE = new Vector3(0, 0.2, 0);

describe.each(TEST_BODIES)('attachToJoint on the $name body', (body) => {
  it('is the identity in the rest pose and follows the joint when it moves', async () => {
    const figure = decodeFigure(await body.loadData());
    const frame = new RestFrame(figure);
    const group = new Group();
    const update = attachToJoint(figure, frame, HEAD_JOINT, group);
    group.matrix.elements.forEach((value, i) => {
      expect(value).toBeCloseTo(new Matrix4().elements[i], 5);
    });
    const parameters = figure.createParameters();
    parameters[figure.parameterIndex(HEAD_PARAMETER)] = 0.4;
    figure.solveSkeleton(parameters);
    update();
    const moved = PROBE.clone().applyMatrix4(group.matrix);
    expect(moved.distanceTo(PROBE)).toBeGreaterThan(TOLERANCE);
  });
});
