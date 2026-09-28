import { BufferAttribute, BufferGeometry } from 'three';
import type { SpiralSegment } from './spiral';
import { spiralSampleCount, writeSpiral } from './spiral';

export interface RibbonSection {
  readonly halfWidth: number;
  readonly bottom: number;
  readonly top: number;
}

const XY = 2;
const XYZ = 3;
const FACES = 4;
const VERTICES_PER_SAMPLE = FACES * 2;
const CAP_VERTICES = 4;
const QUAD_INDICES = 6;

export function lateralNormals(path: Float32Array, target: Float32Array): void {
  const count = path.length / XY;
  for (let index = 0; index < count; index += 1) {
    const before = Math.max(0, index - 1);
    const after = Math.min(count - 1, index + 1);
    const dx = path[after * XY] - path[before * XY];
    const dy = path[after * XY + 1] - path[before * XY + 1];
    const length = Math.hypot(dx, dy) || 1;
    target[index * XY] = -dy / length;
    target[index * XY + 1] = dx / length;
  }
}

function faceIndices(samples: number): number[] {
  const indices: number[] = [];
  const quad = (a: number, b: number, c: number, d: number) => indices.push(a, c, b, a, d, c);
  for (let index = 0; index < samples - 1; index += 1) {
    const here = index * VERTICES_PER_SAMPLE;
    const next = here + VERTICES_PER_SAMPLE;
    for (let face = 0; face < FACES; face += 1) {
      const a = here + face * 2;
      quad(a, next + face * 2, next + face * 2 + 1, a + 1);
    }
  }
  const caps = samples * VERTICES_PER_SAMPLE;
  quad(caps, caps + 1, caps + 2, caps + 3);
  quad(
    caps + CAP_VERTICES,
    caps + CAP_VERTICES + 3,
    caps + CAP_VERTICES + 2,
    caps + CAP_VERTICES + 1,
  );
  return indices;
}

export class RibbonGeometry {
  readonly geometry = new BufferGeometry();
  readonly samples: number;
  private readonly path: Float32Array;
  private readonly lateral: Float32Array;
  private readonly positions: BufferAttribute;
  private readonly normals: BufferAttribute;

  constructor(segments: readonly SpiralSegment[]) {
    this.samples = spiralSampleCount(segments);
    this.path = new Float32Array(this.samples * XY);
    this.lateral = new Float32Array(this.samples * XY);
    const vertices = this.samples * VERTICES_PER_SAMPLE + CAP_VERTICES * 2;
    this.positions = new BufferAttribute(new Float32Array(vertices * XYZ), XYZ);
    this.normals = new BufferAttribute(new Float32Array(vertices * XYZ), XYZ);
    this.geometry.setAttribute('position', this.positions);
    this.geometry.setAttribute('normal', this.normals);
    this.geometry.setIndex(faceIndices(this.samples));
  }

  get triangleCount(): number {
    return ((this.samples - 1) * FACES + 2) * (QUAD_INDICES / 3);
  }

  write(segments: readonly SpiralSegment[], section: RibbonSection): void {
    writeSpiral(this.path, segments);
    lateralNormals(this.path, this.lateral);
    for (let index = 0; index < this.samples; index += 1) this.writeSample(index, section);
    this.writeCap(0, section, -1);
    this.writeCap(this.samples - 1, section, 1);
    this.positions.needsUpdate = true;
    this.normals.needsUpdate = true;
    this.geometry.computeBoundingSphere();
    this.geometry.computeBoundingBox();
  }

  private edge(index: number, side: number, halfWidth: number): [number, number] {
    const x = this.path[index * XY] + this.lateral[index * XY] * halfWidth * side;
    const y = this.path[index * XY + 1] + this.lateral[index * XY + 1] * halfWidth * side;
    return [x, y];
  }

  private set(vertex: number, x: number, y: number, z: number, normal: readonly number[]): void {
    this.positions.setXYZ(vertex, x, y, z);
    this.normals.setXYZ(vertex, normal[0], normal[1], normal[2]);
  }

  private writeSample(index: number, section: RibbonSection): void {
    const { halfWidth, bottom, top } = section;
    const [lx, ly] = this.edge(index, 1, halfWidth);
    const [rx, ry] = this.edge(index, -1, halfWidth);
    const nx = this.lateral[index * XY];
    const ny = this.lateral[index * XY + 1];
    const base = index * VERTICES_PER_SAMPLE;
    this.set(base, lx, ly, top, [0, 0, 1]);
    this.set(base + 1, rx, ry, top, [0, 0, 1]);
    this.set(base + 2, rx, ry, bottom, [0, 0, -1]);
    this.set(base + 3, lx, ly, bottom, [0, 0, -1]);
    this.set(base + 4, lx, ly, bottom, [nx, ny, 0]);
    this.set(base + 5, lx, ly, top, [nx, ny, 0]);
    this.set(base + 6, rx, ry, top, [-nx, -ny, 0]);
    this.set(base + 7, rx, ry, bottom, [-nx, -ny, 0]);
  }

  private writeCap(index: number, section: RibbonSection, direction: number): void {
    const { halfWidth, bottom, top } = section;
    const [lx, ly] = this.edge(index, 1, halfWidth);
    const [rx, ry] = this.edge(index, -1, halfWidth);
    const normal = [
      this.lateral[index * XY + 1] * direction,
      -this.lateral[index * XY] * direction,
      0,
    ];
    const base = this.samples * VERTICES_PER_SAMPLE + (direction > 0 ? CAP_VERTICES : 0);
    this.set(base, lx, ly, bottom, normal);
    this.set(base + 1, lx, ly, top, normal);
    this.set(base + 2, rx, ry, top, normal);
    this.set(base + 3, rx, ry, bottom, normal);
  }
}

export function spiralRibbon(
  inner: number,
  outer: number,
  turns: number,
  height: number,
  thickness: number,
  samplesPerTurn = 64,
): BufferGeometry {
  const segments: SpiralSegment[] = [
    {
      fromRadius: inner,
      toRadius: outer,
      fromAngle: 0,
      sweep: turns * Math.PI * 2,
      samples: Math.max(2, Math.ceil(turns * samplesPerTurn)),
    },
  ];
  const ribbon = new RibbonGeometry(segments);
  ribbon.write(segments, { halfWidth: thickness / 2, bottom: 0, top: height });
  return ribbon.geometry;
}
