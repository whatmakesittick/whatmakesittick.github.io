import type { BufferGeometry } from 'three';
import { BOAT, FAIRING, HULL_DETAIL, JET, TRANSOM_X } from '../../../model/layout';
import { HULL_LINES, SHELL, SURFACE_MAPS } from '../../constants';
import { band, flatPolygon, offsetPolyline, pinToAxis } from '../../geometry/flat';
import { deckYAt, hullSectionAt, hullStationXs } from '../../geometry/hullLines';
import type { HullSection, Pair } from '../../geometry/hullLines';
import { gridSurface, mirrorZ, orientFrom } from '../../geometry/surface';
import type { Uv, Vec3 } from '../../geometry/surface';

export type PointName =
  'keel' | 'intake' | 'chine' | 'flat' | 'knuckle' | 'sheer' | 'split' | 'panelEdge' | 'centre';

export type Look = 'side' | 'deck' | 'inner' | 'section';
export type ShellGroup = 'hull' | 'chines' | 'sprayRails';

export interface ShellPiece {
  geometry: BufferGeometry;
  group: ShellGroup;
  look: Look;
  side: 'starboard' | 'portAft' | 'portFore' | 'opened';
}

type RowNames = readonly PointName[];
type Keep = (row: number, x: number) => boolean;

const HOLE_SEGMENTS = 20;

export function pointOf(section: HullSection, name: PointName): Pair {
  switch (name) {
    case 'keel':
      return [0, section.keel];
    case 'centre':
      return [0, section.deck];
    default:
      return section[name];
  }
}

function gap(a: Pair, b: Pair): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

const SIDE_ORDER: readonly PointName[] = ['sheer', 'knuckle', 'flat', 'chine', 'intake', 'keel'];

export function sideDepth(section: HullSection, name: PointName): number {
  let depth = 0;
  for (let at = 1; at < SIDE_ORDER.length; at += 1) {
    depth += gap(pointOf(section, SIDE_ORDER[at - 1]), pointOf(section, SIDE_ORDER[at]));
    if (SIDE_ORDER[at] === name) return depth;
  }
  return 0;
}

export function alongHull(x: number): number {
  return (x - TRANSOM_X) / BOAT.length;
}

export function acrossDeck(z: number): number {
  return (z + BOAT.beam / 2) / BOAT.beam;
}

function sideUv(section: HullSection, name: PointName): Uv {
  return [alongHull(section.x), sideDepth(section, name) / SURFACE_MAPS.side.span];
}

function deckUv(section: HullSection, name: PointName): Uv {
  return [alongHull(section.x), acrossDeck(pointOf(section, name)[0])];
}

const inIntake = (x: number) => x > JET.intake.x[0] && x < JET.intake.x[1];
const inFairing = (x: number) => x > FAIRING.x[0] && x < FAIRING.x[1];

function rowsOf(
  sections: readonly HullSection[],
  pick: (section: HullSection, row: number) => Pair,
  count: number,
) {
  return Array.from({ length: count }, (_, row) =>
    sections.map((section): Vec3 => {
      const [z, y] = pick(section, row);
      return [section.x, y, z];
    }),
  );
}

function strip(
  sections: readonly HullSection[],
  names: RowNames,
  look: 'side' | 'deck',
  keep?: Keep,
): BufferGeometry {
  const rows = rowsOf(sections, (section, row) => pointOf(section, names[row]), names.length);
  const uv = look === 'side' ? sideUv : deckUv;
  const geometry = gridSurface(rows, {
    uv: (row, column) => uv(sections[column], names[row]),
    keep: keep
      ? (row, column) => keep(row, (sections[column].x + sections[column + 1].x) / 2)
      : undefined,
  });
  return orientFrom(geometry, SHELL.centre);
}

interface StripSpec {
  names: RowNames;
  look: 'side' | 'deck';
  group: ShellGroup;
  until?: number;
  keep?: Keep;
}

const OUTER_STRIPS: readonly StripSpec[] = [
  {
    names: ['keel', 'intake', 'chine'],
    look: 'side',
    group: 'hull',
    keep: (row, x) => row > 0 || !inIntake(x),
  },
  { names: ['chine', 'flat'], look: 'side', group: 'chines', until: HULL_DETAIL.chineFlat.endX },
  { names: ['flat', 'knuckle'], look: 'side', group: 'hull' },
  { names: ['knuckle', 'sheer'], look: 'side', group: 'hull' },
  {
    names: ['sheer', 'split', 'panelEdge'],
    look: 'deck',
    group: 'hull',
    keep: (row, x) => row === 0 || !inFairing(x),
  },
  { names: ['panelEdge', 'centre'], look: 'deck', group: 'hull', keep: (_, x) => !inFairing(x) },
];

function sliceIndex(sections: readonly HullSection[], x: number): number {
  const found = sections.findIndex((section) => section.x >= x - HULL_LINES.stations.tolerance);
  return found < 0 ? sections.length - 1 : found;
}

function sidePieces(
  sections: readonly HullSection[],
  build: (part: readonly HullSection[]) => BufferGeometry,
  group: ShellGroup,
  look: Look,
): ShellPiece[] {
  const cut = sliceIndex(sections, HULL_LINES.cutX);
  const pieces: ShellPiece[] = [
    { geometry: build(sections), group, look, side: 'starboard' },
    { geometry: mirrorZ(build(sections.slice(0, cut + 1))), group, look, side: 'portAft' },
  ];
  if (cut < sections.length - 1) {
    const fore = sections.slice(cut);
    pieces.push({ geometry: mirrorZ(build(fore)), group, look, side: 'portFore' });
  }
  return pieces;
}

function railRows(section: HullSection): Pair[] {
  const { knuckle, sheer, rail } = section;
  const share = rail / HULL_DETAIL.sprayRail.width;
  const length = Math.max(gap(knuckle, sheer), HULL_LINES.epsilon);
  const rise = SHELL.railRise * share;
  return [
    knuckle,
    [knuckle[0] + rail, knuckle[1]],
    [
      knuckle[0] + ((sheer[0] - knuckle[0]) / length) * rise,
      knuckle[1] + ((sheer[1] - knuckle[1]) / length) * rise,
    ],
  ];
}

function railStrip(sections: readonly HullSection[]): BufferGeometry {
  const rows = rowsOf(sections, (section, row) => railRows(section)[row], SHELL.railUv.length);
  const geometry = gridSurface(rows, {
    uv: (row, column) => [alongHull(sections[column].x), SHELL.railUv[row]],
  });
  return orientFrom(geometry, SHELL.centre);
}

const INNER_NAMES: readonly PointName[] = [
  'keel',
  'intake',
  'chine',
  'knuckle',
  'sheer',
  'split',
  'panelEdge',
  'centre',
];

export function innerProfile(section: HullSection, thickness = SHELL.thickness): Pair[] {
  const outer = INNER_NAMES.map((name) => pointOf(section, name));
  const inner = offsetPolyline(outer, thickness);
  const last = inner.length - 1;
  inner[0] = pinToAxis(inner[0], [outer[1][0] - outer[0][0], outer[1][1] - outer[0][1]]);
  inner[last] = pinToAxis(inner[last], [
    outer[last][0] - outer[last - 1][0],
    outer[last][1] - outer[last - 1][1],
  ]);
  return inner;
}

function innerStrip(sections: readonly HullSection[]): BufferGeometry {
  const profiles = sections.map((section) => innerProfile(section));
  const rows = Array.from({ length: INNER_NAMES.length }, (_, row) =>
    sections.map((section, column): Vec3 => {
      const [z, y] = profiles[column][row];
      return [section.x, y, z];
    }),
  );
  const geometry = gridSurface(rows, {
    keep: (row, column) => {
      const x = (sections[column].x + sections[column + 1].x) / 2;
      if (row === 0 && inIntake(x)) return false;
      return row < INNER_NAMES.indexOf('split') || !inFairing(x);
    },
  });
  return orientFrom(geometry, SHELL.centre, false);
}

const atZero = (a: number, b: number): Vec3 => [a, b, 0];

function centreBands(sections: readonly HullSection[]): BufferGeometry[] {
  const runs = (test: (x: number) => boolean) => {
    const groups: HullSection[][] = [];
    sections.forEach((section) => {
      if (section.x > HULL_LINES.cutX + HULL_LINES.epsilon) return;
      if (!test(section.x)) {
        groups.push([]);
        return;
      }
      if (groups.length === 0) groups.push([]);
      groups[groups.length - 1].push(section);
    });
    return groups.filter((group) => group.length > 1);
  };
  const near = HULL_LINES.epsilon;
  const keelRuns = runs((x) => x <= JET.intake.x[0] + near || x >= JET.intake.x[1] - near);
  const deckRuns = runs((x) => x <= FAIRING.x[0] + near || x >= FAIRING.x[1] - near);
  const keel = keelRuns.map((run) =>
    flatPolygon(
      [
        ...run.map((section): Pair => [section.x, section.keel]),
        ...run.map((section): Pair => [section.x, innerProfile(section)[0][1]]).reverse(),
      ],
      atZero,
    ),
  );
  const deck = deckRuns.map((run) =>
    flatPolygon(
      [
        ...run.map((section): Pair => [section.x, section.deck]),
        ...run
          .map((section): Pair => [section.x, innerProfile(section)[INNER_NAMES.length - 1][1]])
          .reverse(),
      ],
      atZero,
    ),
  );
  return [...keel, ...deck].map((geometry) => orientFrom(geometry, SHELL.port));
}

function transomOutline(section: HullSection): Pair[] {
  const outer = INNER_NAMES.slice(0, -1).map((name) => pointOf(section, name));
  outer.splice(3, 0, section.flat);
  const radius = SHELL.jetHole;
  const hole = Array.from({ length: HOLE_SEGMENTS + 1 }, (_, index): Pair => {
    const angle = Math.PI / 2 - (index / HOLE_SEGMENTS) * Math.PI;
    return [radius * Math.cos(angle), JET.axisY + radius * Math.sin(angle)];
  });
  return [...outer, [0, section.deck], ...hole];
}

function transomPieces(section: HullSection): ShellPiece[] {
  const outline = transomOutline(section);
  const uv = (z: number, y: number): Uv => [
    0,
    Math.max(0, deckYAt(TRANSOM_X, z) - y) / SURFACE_MAPS.side.span,
  ];
  const at =
    (x: number) =>
    (z: number, y: number): Vec3 => [x, y, z];
  const outer = orientFrom(flatPolygon(outline, at(TRANSOM_X), [], uv), SHELL.centre);
  const inner = orientFrom(
    flatPolygon(outline, at(TRANSOM_X + SHELL.thickness)),
    SHELL.centre,
    false,
  );
  const [keel, , , , , , , , deckCentre] = outline;
  const top = JET.axisY + SHELL.jetHole;
  const bottom = JET.axisY - SHELL.jetHole;
  const strip = (from: number, to: number): Pair[] => [
    [TRANSOM_X, from],
    [TRANSOM_X + SHELL.thickness, from],
    [TRANSOM_X + SHELL.thickness, to],
    [TRANSOM_X, to],
  ];
  const cut = [strip(keel[1], bottom), strip(top, deckCentre[1])].map((rectangle) =>
    orientFrom(flatPolygon(rectangle, atZero), SHELL.port),
  );
  return [
    { geometry: outer, group: 'hull', look: 'side', side: 'starboard' },
    { geometry: mirrorZ(outer.clone()), group: 'hull', look: 'side', side: 'portAft' },
    { geometry: inner, group: 'hull', look: 'inner', side: 'opened' },
    ...cut.map((geometry): ShellPiece => ({
      geometry,
      group: 'hull',
      look: 'section',
      side: 'opened',
    })),
  ];
}

function cutRing(section: HullSection): BufferGeometry {
  const outer = [...INNER_NAMES.slice(0, 3), 'flat' as const, ...INNER_NAMES.slice(3)].map((name) =>
    pointOf(section, name),
  );
  const inner = innerProfile(section);
  const ring = [...outer, ...inner.reverse()].map(([z, y]): Pair => [-z, y]);
  const place = (z: number, y: number): Vec3 => [section.x, y, z];
  return orientFrom(flatPolygon(ring, place), [section.x + 1, 0, 0]);
}

export function buildHullShell(): ShellPiece[] {
  const sections = hullStationXs().map(hullSectionAt);
  const pieces: ShellPiece[] = OUTER_STRIPS.flatMap((spec) => {
    const limited = spec.until
      ? sections.filter((section) => section.x <= spec.until! + HULL_LINES.epsilon)
      : sections;
    return sidePieces(
      limited,
      (part) => strip(part, spec.names, spec.look, spec.keep),
      spec.group,
      spec.look,
    );
  });
  const [railFrom, railTo] = HULL_DETAIL.sprayRail.x;
  const railSections = sections.filter((section) => section.x >= railFrom && section.x <= railTo);
  pieces.push(...sidePieces(railSections, railStrip, 'sprayRails', 'side'));
  const cutIndex = sliceIndex(sections, HULL_LINES.cutX);
  const aft = sections.slice(0, cutIndex + 1);
  pieces.push(
    { geometry: innerStrip(aft), group: 'hull', look: 'inner', side: 'opened' },
    ...centreBands(sections).map((geometry): ShellPiece => ({
      geometry,
      group: 'hull',
      look: 'section',
      side: 'opened',
    })),
    { geometry: cutRing(sections[cutIndex]), group: 'hull', look: 'section', side: 'opened' },
    ...transomPieces(sections[0]),
  );
  return pieces;
}

export function fairingBandProfile(): Pair[] {
  const [aft, fore] = FAIRING.x;
  return [
    [aft, deckYAt(aft, 0)],
    [aft, FAIRING.top],
    [FAIRING.frontTopX, FAIRING.top],
    [fore, deckYAt(fore, 0)],
  ];
}

export function fairingCutBand(): BufferGeometry {
  return orientFrom(flatPolygon(band(fairingBandProfile(), -SHELL.fairing), atZero), SHELL.port);
}
