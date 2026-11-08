import { EdgesGeometry, Vector2 } from 'three';
import type { BufferGeometry, Material, Mesh, Object3D } from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import type { MaterialFinish } from '@core/scene/materials';
import type { Point } from '../../../ids';
import { THEME } from '../../../theme';
import { FINISHES } from '../../finishes';
import { partMesh, registeredMaterial } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { mergeParts } from '../keyboard/geometry';
import type { Planar } from './shapes';

export type Tone = 'frame' | 'wood' | 'felt';
export type Ink = Tone | 'string';
export type Segment = readonly [Point, Point];

interface Opacity {
  lineUp: number;
  chosen: number;
}

interface ToneStyle {
  finish: MaterialFinish;
  body: Opacity;
  ink: string;
  line: Opacity;
}

const CREASE_DEGREES = 30;
const LINE_PIXELS = 2;
const TONES: Readonly<Record<Tone, ToneStyle>> = {
  frame: {
    finish: { ...FINISHES.ghost, emissiveIntensity: 0.2 },
    body: { lineUp: 0.16, chosen: 0.26 },
    ink: THEME.ghost,
    line: { lineUp: 0.32, chosen: 0.55 },
  },
  wood: {
    finish: { ...FINISHES.ghost, emissiveIntensity: 0.55 },
    body: { lineUp: 0.4, chosen: 0.58 },
    ink: THEME.ghost,
    line: { lineUp: 0.9, chosen: 1 },
  },
  felt: {
    finish: { ...FINISHES.ghost, color: THEME.felt, emissive: THEME.felt },
    body: { lineUp: 0.7, chosen: 0.85 },
    ink: THEME.felt,
    line: { lineUp: 0.9, chosen: 1 },
  },
};
const STRING_STYLE = {
  finish: { ...FINISHES.ghost, color: THEME.steel, emissive: THEME.steel, emissiveIntensity: 0.6 },
  body: { lineUp: 0.85, chosen: 1 },
  ink: THEME.steel,
  line: { lineUp: 0.85, chosen: 1 },
} as const satisfies ToneStyle;
const INKS: Readonly<Record<Ink, ToneStyle>> = { ...TONES, string: STRING_STYLE };

export interface GhostPainter {
  solid(parent: Object3D, parts: readonly BufferGeometry[], tone?: Tone): Mesh;
  body(parent: Object3D, geometry: BufferGeometry, ink: Ink): Mesh;
  lines(parent: Object3D, segments: readonly Segment[], ink?: Ink): LineSegments2;
  choose(chosen: boolean): void;
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

function inkMaterial(style: ToneStyle): LineMaterial {
  return new LineMaterial({
    color: style.ink,
    linewidth: LINE_PIXELS,
    transparent: true,
    opacity: style.line.lineUp,
  });
}

export function ghostPainter(context: PartContext, group: EmphasisGroup): GhostPainter {
  const levels = new Map<Material, Opacity>();
  const size = new Vector2();
  const inks = Object.fromEntries(
    (Object.keys(INKS) as Ink[]).map((ink) => {
      const material = registeredMaterial(context, group, inkMaterial(INKS[ink]), false);
      levels.set(material, INKS[ink].line);
      return [ink, material];
    }),
  ) as Record<Ink, LineMaterial>;
  const fatLines = (positions: ArrayLike<number>, ink: Ink) => {
    const geometry = context.tracker.track(new LineSegmentsGeometry());
    geometry.setPositions(Array.from(positions));
    const material = inks[ink];
    const lines = new LineSegments2(geometry, material);
    lines.raycast = () => {};
    lines.onBeforeRender = (renderer) => {
      material.resolution.copy(renderer.getSize(size));
    };
    return lines;
  };
  const mesh = (geometry: BufferGeometry, style: ToneStyle) => {
    const made = partMesh(context, geometry, group, style.finish);
    const material = made.material as Material;
    material.opacity = style.body.lineUp;
    levels.set(material, style.body);
    return made;
  };
  const outline = (geometry: BufferGeometry, tone: Tone) => {
    const edges = new EdgesGeometry(geometry, CREASE_DEGREES);
    const lines = fatLines(edges.getAttribute('position').array, tone);
    edges.dispose();
    return lines;
  };

  return {
    solid(parent, parts, tone = 'wood') {
      const geometry = mergeParts(parts);
      const made = mesh(geometry, TONES[tone]);
      made.add(outline(geometry, tone));
      parent.add(made);
      return made;
    },
    body(parent, geometry, ink) {
      const made = mesh(geometry, INKS[ink]);
      parent.add(made);
      return made;
    },
    lines(parent, segments, ink = 'wood') {
      const flat = segments.flatMap(([from, to]) => [...from, ...to]);
      const lines = fatLines(flat, ink);
      lines.name = `${group}Lines`;
      parent.add(lines);
      return lines;
    },
    choose(chosen) {
      levels.forEach((opacity, material) => {
        material.opacity = chosen ? opacity.chosen : opacity.lineUp;
      });
    },
  };
}
