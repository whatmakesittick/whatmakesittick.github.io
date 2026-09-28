import type { BufferGeometry } from 'three';
import { depthToY } from '../../../model/scale';
import { TOTAL_DEPTH_M } from '../../../model/wellPlan';
import { BLOCK, HOLE, RELIEF, ROCK } from '../../constants';
import { MeshBuilder } from '../../geometry/meshBuilder';
import type { Vec3 } from '../../geometry/meshBuilder';
import { seabedRelief, seabedY } from '../../geometry/relief';
import type { Span } from '../../geometry/spans';
import type { Band } from '../../geometry/strata';
import { holeIntervals, slotHalfWidth } from '../../geometry/wellColumn';

export interface BandGeometry {
  geometry: BufferGeometry;
  cutIndexCount: number;
  spans: Span[];
}

interface Slab {
  back: number;
  front: number;
  slotted: boolean;
}

type Uv = readonly [number, number];
type Corners = readonly [Vec3, Vec3, Vec3, Vec3];

const FRONT: Vec3 = [0, 0, 1];
const BACK: Vec3 = [0, 0, -1];
const DOWN: Vec3 = [0, -1, 0];
const SLOPE_STEP = 0.5;
const SLOT = slotHalfWidth();

const faceUv = ([x, y]: Vec3): Uv => [x, y];
const sideUv = ([, y, z]: Vec3): Uv => [z, y];
const planUv = ([x, , z]: Vec3): Uv => [x, z];

function quad(builder: MeshBuilder, corners: Corners, normal: Vec3, uv: (p: Vec3) => Uv): number[] {
  const indices = corners.map((corner) => builder.vertex(corner, normal, uv(corner)));
  builder.quad(indices[0], indices[1], indices[2], indices[3]);
  return indices;
}

function columns(from: number, to: number): number[] {
  const count = Math.max(1, Math.round((to - from) / ROCK.columnStep));
  return Array.from({ length: count + 1 }, (_, index) => from + ((to - from) * index) / count);
}

function rows(from: number, to: number): number[] {
  const count = Math.max(1, Math.round((to - from) / RELIEF.cell));
  return Array.from({ length: count + 1 }, (_, index) => from + ((to - from) * index) / count);
}

class BandBuilder {
  private readonly builder = new MeshBuilder();
  private readonly band: Band;
  private readonly surfaced: boolean;
  private readonly floored: boolean;
  readonly spans: Span[] = [];

  constructor(band: Band, surfaced: boolean, floored: boolean) {
    this.band = band;
    this.surfaced = surfaced;
    this.floored = floored;
  }

  get indexCount(): number {
    return this.builder.indexCount;
  }

  top(x: number, z: number): number {
    return this.surfaced ? seabedY(x, z) : depthToY(this.band.top(x));
  }

  bottom(x: number): number {
    return depthToY(this.band.bottom(x));
  }

  slab(slab: Slab): void {
    if (slab.slotted) {
      this.faceStrip(columns(-BLOCK.halfWidth, -SLOT), slab.front, FRONT);
      this.faceStrip(columns(SLOT, BLOCK.halfWidth), slab.front, FRONT);
      this.slotBelowTotalDepth(slab.front);
    } else {
      this.faceStrip(columns(-BLOCK.halfWidth, BLOCK.halfWidth), slab.front, FRONT);
    }
    if (slab.back === BLOCK.back) {
      this.faceStrip(columns(-BLOCK.halfWidth, BLOCK.halfWidth), slab.back, BACK);
    }
    this.sides(slab);
    if (this.surfaced) this.surface(slab);
    if (this.floored) this.floor(slab);
  }

  slot(face: number): void {
    const crestTop = this.band.top(0);
    const crestBottom = this.band.bottom(0);
    holeIntervals().forEach((interval) => {
      const from = Math.max(crestTop, interval.top);
      const to = Math.min(crestBottom, interval.bottom);
      if (to <= from) return;
      const high = this.surfaced && from === crestTop ? this.top(0, face) : depthToY(from);
      const low = depthToY(to);
      if (interval.radius < SLOT) {
        this.slotQuad(interval.radius, SLOT, low, high, face);
        this.slotQuad(-SLOT, -interval.radius, low, high, face);
      }
      const reach = interval.radius + HOLE.plugOverlap;
      const plug = this.slotQuad(-reach, reach, low, high, face);
      this.spans.push({ vertices: [plug[2], plug[3]], low, high });
    });
  }

  build(): BufferGeometry {
    return this.builder.build(true);
  }

  private slotQuad(left: number, right: number, low: number, high: number, face: number) {
    return quad(
      this.builder,
      [
        [left, low, face],
        [right, low, face],
        [right, high, face],
        [left, high, face],
      ],
      FRONT,
      faceUv,
    );
  }

  private slotBelowTotalDepth(face: number): void {
    const from = Math.max(this.band.top(0), TOTAL_DEPTH_M);
    const to = this.band.bottom(0);
    if (to <= from) return;
    this.slotQuad(-SLOT, SLOT, depthToY(to), depthToY(from), face);
  }

  private faceStrip(xs: number[], z: number, normal: Vec3): void {
    for (let index = 0; index < xs.length - 1; index++) {
      const [left, right] = [xs[index], xs[index + 1]];
      const lowLeft: Vec3 = [left, this.bottom(left), z];
      const lowRight: Vec3 = [right, this.bottom(right), z];
      const highRight: Vec3 = [right, this.top(right, z), z];
      const highLeft: Vec3 = [left, this.top(left, z), z];
      if (highLeft[1] - lowLeft[1] + highRight[1] - lowRight[1] <= 0) continue;
      const corners: Corners =
        normal === FRONT
          ? [lowLeft, lowRight, highRight, highLeft]
          : [lowRight, lowLeft, highLeft, highRight];
      quad(this.builder, corners, normal, faceUv);
    }
  }

  private sides(slab: Slab): void {
    const zs = this.surfaced ? rows(slab.back, slab.front) : [slab.back, slab.front];
    [-1, 1].forEach((side) => {
      const x = side * BLOCK.halfWidth;
      const low = this.bottom(x);
      for (let index = 0; index < zs.length - 1; index++) {
        const [near, far] = side > 0 ? [zs[index + 1], zs[index]] : [zs[index], zs[index + 1]];
        if (this.top(x, near) <= low && this.top(x, far) <= low) continue;
        quad(
          this.builder,
          [
            [x, low, near],
            [x, low, far],
            [x, this.top(x, far), far],
            [x, this.top(x, near), near],
          ],
          [side, 0, 0],
          sideUv,
        );
      }
    });
  }

  private surface(slab: Slab): void {
    const xs = columns(-BLOCK.halfWidth, BLOCK.halfWidth);
    const zs = rows(slab.back, slab.front);
    const grid = zs.map((z) => xs.map((x) => this.surfaceVertex(x, z)));
    for (let row = 0; row < zs.length - 1; row++) {
      for (let column = 0; column < xs.length - 1; column++) {
        this.builder.quad(
          grid[row][column],
          grid[row + 1][column],
          grid[row + 1][column + 1],
          grid[row][column + 1],
        );
      }
    }
  }

  private surfaceVertex(x: number, z: number): number {
    const slopeX =
      (seabedRelief(x + SLOPE_STEP, z) - seabedRelief(x - SLOPE_STEP, z)) / (2 * SLOPE_STEP);
    const slopeZ =
      (seabedRelief(x, z + SLOPE_STEP) - seabedRelief(x, z - SLOPE_STEP)) / (2 * SLOPE_STEP);
    const length = Math.hypot(slopeX, 1, slopeZ);
    const point: Vec3 = [x, seabedY(x, z), z];
    return this.builder.vertex(
      point,
      [-slopeX / length, 1 / length, -slopeZ / length],
      planUv(point),
    );
  }

  private floor(slab: Slab): void {
    const y = this.bottom(0);
    const { halfWidth } = BLOCK;
    quad(
      this.builder,
      [
        [-halfWidth, y, slab.back],
        [halfWidth, y, slab.back],
        [halfWidth, y, slab.front],
        [-halfWidth, y, slab.front],
      ],
      DOWN,
      planUv,
    );
  }
}

export function bandGeometry(band: Band, surfaced: boolean, floored: boolean): BandGeometry {
  const builder = new BandBuilder(band, surfaced, floored);
  builder.slab({ back: BLOCK.back, front: BLOCK.cutZ, slotted: true });
  builder.slot(BLOCK.cutZ);
  const cutIndexCount = builder.indexCount;
  builder.slab({ back: BLOCK.cutZ, front: BLOCK.front, slotted: false });
  return { geometry: builder.build(), cutIndexCount, spans: builder.spans };
}
