import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Path,
  Shape,
  Vector2,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FULL_TURN } from '@core/math';

const ROOT_HALF_WIDTH = 0.3;
const TIP_HALF_WIDTH = 0.14;
const GAP_CENTRE = 0.5;
const DEDENDUM = 1.25;
const HOLE_SEGMENTS = 14;
const XYZ = 3;

export interface SpurGearSpec {
  readonly teeth: number;
  readonly module: number;
  readonly faceWidth: number;
  readonly holes: number;
  readonly hubRadius: number;
  readonly hubProtrusion: number;
}

export interface BevelGearSpec {
  readonly teeth: number;
  readonly module: number;
  readonly length: number;
  readonly narrowScale: number;
}

export interface TrainGear {
  readonly teeth: number;
  readonly pitchRadius: number;
  readonly x: number;
  readonly y: number;
  readonly phase: number;
  readonly ratio: number;
}

export interface TrainSpec {
  readonly teeth: readonly number[];
  readonly offsets: readonly number[];
  readonly module: number;
  readonly startX: number;
  readonly inputRatio: number;
}

export function pitchRadius(teeth: number, module: number): number {
  return (teeth * module) / 2;
}

export function toothOutline(teeth: number, module: number): Vector2[] {
  const pitch = pitchRadius(teeth, module);
  const tip = pitch + module;
  const root = pitch - DEDENDUM * module;
  const step = FULL_TURN / teeth;
  const points: Vector2[] = [];
  const add = (angle: number, radius: number): void => {
    points.push(new Vector2(radius * Math.cos(angle), radius * Math.sin(angle)));
  };
  for (let index = 0; index < teeth; index += 1) {
    const centre = index * step;
    add(centre - ROOT_HALF_WIDTH * step, root);
    add(centre - TIP_HALF_WIDTH * step, tip);
    add(centre + TIP_HALF_WIDTH * step, tip);
    add(centre + ROOT_HALF_WIDTH * step, root);
    add(centre + GAP_CENTRE * step, root);
  }
  return points;
}

function plain(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.deleteAttribute('uv');
  return flat;
}

export function mergePlain(parts: readonly BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts.map(plain));
  parts.forEach((part) => part.dispose());
  return merged;
}

function lighteningHoles(shape: Shape, spec: SpurGearSpec): void {
  if (spec.holes === 0) return;
  const root = pitchRadius(spec.teeth, spec.module) - DEDENDUM * spec.module;
  const orbit = (root + spec.hubRadius) / 2;
  const radius = Math.min(((root - spec.hubRadius) / 2) * 0.62, orbit * 0.5);
  for (let index = 0; index < spec.holes; index += 1) {
    const angle = (index / spec.holes) * FULL_TURN + Math.PI / spec.holes;
    const hole = new Path();
    hole.absarc(orbit * Math.cos(angle), orbit * Math.sin(angle), radius, 0, FULL_TURN, true);
    shape.holes.push(hole);
  }
}

export function spurGearGeometry(spec: SpurGearSpec): BufferGeometry {
  const shape = new Shape(toothOutline(spec.teeth, spec.module));
  lighteningHoles(shape, spec);
  const body = new ExtrudeGeometry(shape, {
    depth: spec.faceWidth,
    bevelEnabled: false,
    curveSegments: HOLE_SEGMENTS,
  });
  body.translate(0, 0, -spec.faceWidth / 2);
  const hubLength = spec.faceWidth + 2 * spec.hubProtrusion;
  const hub = cylinderAlongZ(spec.hubRadius, hubLength, HOLE_SEGMENTS);
  return mergePlain([body, hub]);
}

export function cylinderAlongZ(radius: number, length: number, segments: number): BufferGeometry {
  const shape = new Shape();
  shape.absarc(0, 0, radius, 0, FULL_TURN, false);
  const geometry = new ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
    curveSegments: segments,
  });
  geometry.translate(0, 0, -length / 2);
  return geometry;
}

export function bevelGearGeometry(spec: BevelGearSpec): BufferGeometry {
  const outline = toothOutline(spec.teeth, spec.module);
  const count = outline.length;
  const positions: number[] = [];
  const wide = (index: number): [number, number, number] => {
    const point = outline[index % count];
    return [point.x, point.y, 0];
  };
  const narrow = (index: number): [number, number, number] => {
    const point = outline[index % count];
    return [point.x * spec.narrowScale, point.y * spec.narrowScale, spec.length];
  };
  const push = (...corners: [number, number, number][]): void => {
    corners.forEach((corner) => positions.push(...corner));
  };
  for (let index = 0; index < count; index += 1) {
    push(wide(index), wide(index + 1), narrow(index + 1));
    push(wide(index), narrow(index + 1), narrow(index));
    push([0, 0, 0], wide(index + 1), wide(index));
    push([0, 0, spec.length], narrow(index), narrow(index + 1));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  geometry.computeVertexNormals();
  return geometry;
}

function fraction(value: number): number {
  return value - Math.floor(value);
}

export function layoutTrain(spec: TrainSpec): TrainGear[] {
  const gears: TrainGear[] = [];
  spec.teeth.forEach((teeth, index) => {
    const radius = pitchRadius(teeth, spec.module);
    const y = spec.offsets[index];
    if (index === 0) {
      gears.push({
        teeth,
        pitchRadius: radius,
        x: spec.startX,
        y,
        phase: 0,
        ratio: spec.inputRatio,
      });
      return;
    }
    const before = gears[index - 1];
    const distance = before.pitchRadius + radius;
    const dy = y - before.y;
    const dx = Math.sqrt(distance * distance - dy * dy);
    const contact = Math.atan2(dy, dx);
    const seen = fraction(((contact - before.phase) * before.teeth) / FULL_TURN);
    const phase = contact + Math.PI - ((GAP_CENTRE - seen) * FULL_TURN) / teeth;
    gears.push({
      teeth,
      pitchRadius: radius,
      x: before.x + dx,
      y,
      phase,
      ratio: (-before.ratio * before.teeth) / teeth,
    });
  });
  return gears;
}
