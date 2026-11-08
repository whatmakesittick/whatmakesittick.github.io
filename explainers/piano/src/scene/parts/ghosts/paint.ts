import { BufferGeometry, EdgesGeometry, Float32BufferAttribute, LineBasicMaterial } from 'three';
import { LineSegments } from 'three';
import type { Mesh, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { Point } from '../../../ids';
import { THEME } from '../../../theme';
import { FINISHES } from '../../finishes';
import { partMesh, registeredMaterial } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { mergeParts } from '../keyboard/geometry';
import type { Planar } from './shapes';

export type Tone = 'frame' | 'wood' | 'felt';
export type Segment = readonly [Point, Point];

interface ToneStyle {
  finish: MaterialFinish;
  ink: string;
  inkOpacity: number;
}

const CREASE_DEGREES = 30;
const TONES: Readonly<Record<Tone, ToneStyle>> = {
  frame: {
    finish: { ...FINISHES.ghost, opacity: 0.12, emissiveIntensity: 0.2 },
    ink: THEME.ghost,
    inkOpacity: 0.32,
  },
  wood: {
    finish: { ...FINISHES.ghost, opacity: 0.32, emissiveIntensity: 0.55 },
    ink: THEME.ghost,
    inkOpacity: 0.95,
  },
  felt: {
    finish: { ...FINISHES.ghost, color: THEME.felt, emissive: THEME.felt, opacity: 0.7 },
    ink: THEME.felt,
    inkOpacity: 0.95,
  },
};
const STRING_INK = { color: THEME.steel, opacity: 1 } as const;

export interface GhostPainter {
  solid(parent: Object3D, parts: readonly BufferGeometry[], tone?: Tone): Mesh;
  lines(parent: Object3D, segments: readonly Segment[], tone?: Tone | 'string'): LineSegments;
}

export function planarSegment(from: Planar, to: Planar, x = 0): Segment {
  return [
    [x, ...from],
    [x, ...to],
  ];
}

export function polyline(points: readonly Planar[], x = 0): Segment[] {
  return points.slice(1).map((point, index) => planarSegment(points[index], point, x));
}

export function zigzag(from: Planar, to: Planar, turns: number, amplitude: number, x = 0) {
  const [dy, dz] = [to[0] - from[0], to[1] - from[1]];
  const length = Math.hypot(dy, dz);
  const [ny, nz] = [-dz / length, dy / length];
  const points: Planar[] = [from];
  const steps = turns * 2;
  for (let step = 1; step < steps; step += 1) {
    const share = step / steps;
    const side = step % 2 === 0 ? -amplitude : amplitude;
    points.push([from[0] + dy * share + ny * side, from[1] + dz * share + nz * side]);
  }
  points.push(to);
  return polyline(points, x);
}

export function segmentGeometry(segments: readonly Segment[]): BufferGeometry {
  const geometry = new BufferGeometry();
  const flat = segments.flatMap(([from, to]) => [...from, ...to]);
  geometry.setAttribute('position', new Float32BufferAttribute(flat, 3));
  return geometry;
}

function inkMaterial(color: string, opacity: number): LineBasicMaterial {
  return new LineBasicMaterial({ color, transparent: true, opacity });
}

export function ghostPainter(context: PartContext, group: EmphasisGroup): GhostPainter {
  const register = (material: LineBasicMaterial) =>
    registeredMaterial(context, group, material, false);
  const inks = {
    frame: register(inkMaterial(TONES.frame.ink, TONES.frame.inkOpacity)),
    wood: register(inkMaterial(TONES.wood.ink, TONES.wood.inkOpacity)),
    felt: register(inkMaterial(TONES.felt.ink, TONES.felt.inkOpacity)),
    string: register(inkMaterial(STRING_INK.color, STRING_INK.opacity)),
  };
  const outline = (geometry: BufferGeometry, tone: Tone) =>
    new LineSegments(
      context.tracker.track(new EdgesGeometry(geometry, CREASE_DEGREES)),
      inks[tone],
    );

  return {
    solid(parent, parts, tone = 'wood') {
      const geometry = mergeParts(parts);
      const mesh = partMesh(context, geometry, group, TONES[tone].finish);
      mesh.add(outline(geometry, tone));
      parent.add(mesh);
      return mesh;
    },
    lines(parent, segments, tone = 'wood') {
      const lines = new LineSegments(context.tracker.track(segmentGeometry(segments)), inks[tone]);
      lines.name = `${group}Lines`;
      parent.add(lines);
      return lines;
    },
  };
}
