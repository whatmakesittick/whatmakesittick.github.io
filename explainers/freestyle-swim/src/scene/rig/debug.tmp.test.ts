import { it } from 'vitest';
import { strokeAt } from '../../model';
import { bodyPose } from '../pose';
import { createSkeleton, solveSkeleton } from './skeleton';
it('debug', () => {
  const names = ['rElbow', 'rHand', 'rKnee', 'rToe', 'lElbow', 'lHand', 'lKnee', 'lToe'];
  for (const pace of ['easy', 'middle', 'sprint'] as const) {
    let prev: number[][] | null = null;
    const worst: Record<string, [number, number]> = {};
    for (let u = 0; u <= 1000; u++) {
      const s = solveSkeleton(
        createSkeleton(),
        strokeAt(u, { pace, kick: 'six', breathing: 'right', headUp: false }),
        0,
        bodyPose(0, 0).y,
      );
      const j = (['right', 'left'] as const).flatMap((id) =>
        [s.arms[id].elbow, s.arms[id].hand, s.legs[id].knee, s.legs[id].toe].map((v) =>
          v.toArray(),
        ),
      );
      if (prev)
        j.forEach((p, i) => {
          const d = Math.hypot(p[0] - prev![i][0], p[1] - prev![i][1], p[2] - prev![i][2]);
          if (!worst[names[i]] || d > worst[names[i]][0]) worst[names[i]] = [+d.toFixed(4), u];
        });
      prev = j;
    }
    console.log(pace, JSON.stringify(worst));
  }
  for (const u of [0, 286, 408, 530, 642, 753, 800, 877, 940, 980]) {
    const s = solveSkeleton(
      createSkeleton(),
      strokeAt(u, { pace: 'middle', kick: 'six', breathing: 'none', headUp: false }),
      0,
      bodyPose(0, 0).y,
    );
    const f = (v: { x: number; y: number; z: number }) =>
      `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;
    console.log(
      u,
      'S',
      f(s.arms.right.shoulder),
      'E',
      f(s.arms.right.elbow),
      'H',
      f(s.arms.right.hand),
      'toeL',
      f(s.legs.left.toe),
    );
  }
});
