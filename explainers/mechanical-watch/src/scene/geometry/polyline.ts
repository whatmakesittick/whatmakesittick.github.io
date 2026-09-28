import type { Vec2 } from './outline';
import { distance } from './outline';

export class Polyline {
  readonly length: number;
  private readonly points: readonly Vec2[];
  private readonly starts: readonly number[];

  constructor(points: readonly Vec2[]) {
    this.points = points;
    const starts: number[] = [0];
    for (let index = 1; index < points.length; index += 1) {
      starts.push(starts[index - 1] + distance(points[index - 1], points[index]));
    }
    this.starts = starts;
    this.length = starts[starts.length - 1];
  }

  at(travelled: number): Vec2 {
    const along = ((travelled % this.length) + this.length) % this.length;
    let segment = 0;
    while (segment < this.points.length - 2 && this.starts[segment + 1] < along) segment += 1;
    const from = this.points[segment];
    const to = this.points[segment + 1];
    const span = this.starts[segment + 1] - this.starts[segment];
    const t = span > 0 ? (along - this.starts[segment]) / span : 0;
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  }
}
