import { Curve, Vector3 } from 'three';

export class HelixCurve extends Curve<Vector3> {
  private readonly radius: number;
  private readonly height: number;
  private readonly turns: number;

  constructor(radius: number, height: number, turns: number) {
    super();
    this.radius = radius;
    this.height = height;
    this.turns = turns;
  }

  override getPoint(t: number, target = new Vector3()): Vector3 {
    const angle = Math.PI * 2 * this.turns * t;
    return target.set(
      this.radius * Math.cos(angle),
      this.height * t,
      this.radius * Math.sin(angle),
    );
  }
}
