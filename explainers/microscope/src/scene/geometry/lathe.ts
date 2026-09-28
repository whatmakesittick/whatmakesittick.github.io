import { Shape, ShapeGeometry, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { latheAlongX } from '@core/scene/geometry/lathe';
import type { LatheArc } from '@core/scene/geometry/lathe';
import { HALF_TURN, QUARTER_TURN } from '../../turns';

export type SectionPoint = readonly [radius: number, height: number];
export type Section = readonly SectionPoint[];

export interface CutGeometry {
  whole: BufferGeometry;
  back: BufferGeometry;
  caps?: BufferGeometry;
  lining?: BufferGeometry;
}

export interface CutOptions {
  gap?: number;
  lining?: Section;
}

const LINING_INSET = 0.05;
export const BACK_HALF: LatheArc = { start: HALF_TURN, length: HALF_TURN };

export function latheUpright(
  profile: readonly Vector2[],
  segments: number,
  arc?: LatheArc,
): BufferGeometry {
  return latheAlongX(profile, segments, arc).rotateZ(QUARTER_TURN);
}

export function ringSection(inner: number, outer: number, bottom: number, top: number): Section {
  return [
    [outer, bottom],
    [outer, top],
    [inner, top],
    [inner, bottom],
  ];
}

function sharpPath(section: Section, inset = 0): Vector2[] {
  const corners = section.map(([radius, height]) => new Vector2(radius - inset, height));
  return corners.flatMap((corner, index) =>
    index === 0 || index === corners.length - 1 ? [corner] : [corner, corner.clone()],
  );
}

function sharpLoop(section: Section): Vector2[] {
  return sharpPath([...section, section[0]]);
}

function sectionCaps(section: Section): BufferGeometry {
  const shape = new Shape(section.map(([radius, height]) => new Vector2(radius, height)));
  const away = new ShapeGeometry(shape).rotateY(QUARTER_TURN);
  const toward = away.clone().scale(1, 1, -1);
  const caps = mergeGeometries([away, toward]);
  away.dispose();
  toward.dispose();
  return caps;
}

export function cutSection(
  section: Section,
  segments: number,
  { gap = 0, lining }: CutOptions = {},
): CutGeometry {
  const loop = sharpLoop(section);
  return {
    whole: latheUpright(loop, segments),
    back: latheUpright(loop, segments, BACK_HALF).translate(-gap, 0, 0),
    caps: sectionCaps(section).translate(-gap, 0, 0),
    lining: lining && latheUpright(sharpPath(lining, LINING_INSET), segments, BACK_HALF),
  };
}

export function innerWall(inner: number, bottom: number, top: number): Section {
  return [
    [inner, top],
    [inner, bottom],
  ];
}

export function cutSphere(radius: number, steps: number, segments: number): CutGeometry {
  const arc = Array.from({ length: steps + 1 }, (_, index) => {
    const angle = (index / steps) * HALF_TURN;
    return new Vector2(radius * Math.sin(angle), -radius * Math.cos(angle));
  });
  return { whole: latheUpright(arc, segments), back: latheUpright(arc, segments, BACK_HALF) };
}
