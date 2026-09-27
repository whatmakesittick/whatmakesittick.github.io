import type { Point3 } from '../../model';

const STRIDE = 4;
const RADIUS_OFFSET = 3;

export class PathBuffer {
  readonly capacity: number;
  private readonly data: Float32Array;
  private length = 0;
  private floor: number | null = null;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.data = new Float32Array(capacity * STRIDE);
  }

  get count(): number {
    return this.length;
  }

  reset(floor: number | null = null): void {
    this.length = 0;
    this.floor = floor;
  }

  push(x: number, y: number, z: number, radius: number): void {
    const floor = this.floor;
    if (floor === null) {
      this.append(x, y, z, radius);
      return;
    }
    if (this.length > 0) this.appendCrossing(x, y, z, radius, floor);
    this.append(x, y, z, y < floor ? 0 : radius);
  }

  private appendCrossing(x: number, y: number, z: number, radius: number, floor: number): void {
    const last = this.length - 1;
    const fromY = this.y(last);
    if (fromY < floor === y < floor) return;
    const share = (floor - fromY) / (y - fromY);
    const crossX = this.x(last) + (x - this.x(last)) * share;
    const crossZ = this.z(last) + (z - this.z(last)) * share;
    const goingDown = y < floor;
    this.append(crossX, floor, crossZ, goingDown ? radius : 0);
    this.append(crossX, floor, crossZ, goingDown ? 0 : radius);
  }

  private append(x: number, y: number, z: number, radius: number): void {
    if (this.length >= this.capacity) return;
    const offset = this.length * STRIDE;
    this.data[offset] = x;
    this.data[offset + 1] = y;
    this.data[offset + 2] = z;
    this.data[offset + RADIUS_OFFSET] = radius;
    this.length += 1;
  }

  pushPoint(point: Point3, radius: number): void {
    this.push(point.x, point.y, point.z, radius);
  }

  x(index: number): number {
    return this.data[index * STRIDE];
  }

  y(index: number): number {
    return this.data[index * STRIDE + 1];
  }

  z(index: number): number {
    return this.data[index * STRIDE + 2];
  }

  radius(index: number): number {
    return this.data[index * STRIDE + RADIUS_OFFSET];
  }
}
