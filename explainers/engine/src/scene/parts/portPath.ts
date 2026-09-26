import { CubicBezierCurve, CurvePath, LineCurve, Vector2 } from 'three';
import type { Curve } from 'three';
import { HEAD, PORT } from '../constants';
import type { ValveDimensions } from '../dimensions';
import type { PathSample } from '../geometry/sweep';

export function portBend(valve: ValveDimensions): CubicBezierCurve {
  const { sign, offset } = valve;
  const exit = PORT.exitHeight;
  const reach = offset + (HEAD.halfWidth - offset) * PORT.bendReach;
  return new CubicBezierCurve(
    new Vector2(sign * offset, 0),
    new Vector2(sign * offset, exit * PORT.bendRise),
    new Vector2(sign * reach, exit),
    new Vector2(sign * HEAD.halfWidth, exit),
  );
}

export function runnerEnd(valve: ValveDimensions): Vector2 {
  return new Vector2(valve.sign * (HEAD.halfWidth + PORT.runnerLength), PORT.exitHeight);
}

export function portCenterline(valve: ValveDimensions): CurvePath<Vector2> {
  const bend = portBend(valve);
  const path = new CurvePath<Vector2>();
  path.add(bend);
  path.add(new LineCurve(bend.v3.clone(), runnerEnd(valve)));
  return path;
}

export function samplePath(curve: Curve<Vector2>, count: number): PathSample[] {
  const samples: PathSample[] = [];
  for (let i = 0; i <= count; i++) {
    const u = i / count;
    samples.push({ point: curve.getPointAt(u), tangent: curve.getTangentAt(u).normalize() });
  }
  return samples;
}

export function offsetEdge(samples: readonly PathSample[], distance: number): Vector2[] {
  return samples.map(({ point, tangent }) =>
    new Vector2(-tangent.y, tangent.x).multiplyScalar(distance).add(point),
  );
}

export function portDepth(valves: readonly ValveDimensions[]): number {
  return Math.max(...valves.map((valve) => valve.portRadius)) + PORT.wall / 2;
}
