import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { decodeFigure } from '@core/figure';
import type { Figure } from '@core/figure';
import type { Point, RetargetTarget, Side } from '../retarget';
import { TargetReader } from '../retarget.testkit';
import { TEST_BODIES } from '../bodies.testkit';
import { FigureRig, figureOrigin, rigFromFigure } from './figureRig';
import type { RigArm, RigLeg, RigPose } from './figureRig';

const TURN = new Matrix4().makeRotationY(Math.PI / 3);
const TOLERANCE = 1e-4;

function poseOf(target: RetargetTarget, origin: Vector3, frame: Matrix4): RigPose {
  const into = frame.clone().invert();
  const place = (p: Point) => new Vector3(p.x, p.y, p.z).sub(origin).applyMatrix4(into);
  const direct = (p: Point) => new Vector3(p.x, p.y, p.z).applyMatrix4(into);
  const arm = (side: Side): RigArm => {
    const a = target.arms[side];
    return {
      shoulder: place(a.shoulder),
      elbow: place(a.elbow),
      wrist: place(a.wrist),
      handAxis: direct(a.handAxis),
      palm: direct(a.palm),
    };
  };
  const leg = (side: Side): RigLeg => {
    const l = target.legs[side];
    return {
      hip: place(l.hip),
      knee: place(l.knee),
      ankle: place(l.ankle),
      footAxis: direct(l.footAxis),
      sole: direct(l.sole),
    };
  };
  const head = new Vector3(target.head.x, target.head.y, target.head.z).applyMatrix4(into);
  return {
    arms: { right: arm('right'), left: arm('left') },
    legs: { right: leg('right'), left: leg('left') },
    head: new Quaternion(head.x, head.y, head.z, target.head.w),
  };
}

function restTarget(figure: Figure): RetargetTarget {
  return new TargetReader(figure).read(figure.createParameters());
}

describe.each(TEST_BODIES)('FigureRig on the $name body', (body) => {
  it('turns a rig point into a figure point and back', async () => {
    const figure = decodeFigure(await body.loadData());
    const origin = figureOrigin(figure);
    const toRig = rigFromFigure(TURN, origin);
    const rigPoint = new Vector3(0.3, -0.2, 0.7);
    const figurePoint = rigPoint.clone().applyMatrix4(TURN).add(origin);
    expect(figurePoint.applyMatrix4(toRig).distanceTo(rigPoint)).toBeLessThan(TOLERANCE);
  });

  it('solves the same parameters whichever frame the pose is written in', async () => {
    const figure = decodeFigure(await body.loadData());
    const target = restTarget(figure);
    const origin = figureOrigin(figure);
    const plain = new FigureRig(figure, new Matrix4());
    const turned = new FigureRig(figure, TURN);
    const first = plain.retarget(poseOf(target, origin, new Matrix4()));
    const second = turned.retarget(poseOf(target, origin, TURN));
    first.forEach((value, i) => expect(second[i]).toBeCloseTo(value, 2));
  });
});
