import type { BufferGeometry } from 'three';
import { lerp } from '@core/math';
import { TAIL, WING } from '../constants';
import { airfoilSurface, camberShape, thicknessShape } from './airfoilSurface';
import type { LoopPoint, Station, Vec3 } from './airfoilSurface';

export type Side = 1 | -1;

const CHORD_AXIS: Vec3 = [-1, 0, 0];
const UP: Vec3 = [0, 1, 0];

function spanShare(span: number): number {
  return Math.min(Math.abs(span) / WING.halfSpan, 1);
}

export function chordAt(span: number): number {
  return lerp(WING.rootChord, WING.tipChord, spanShare(span));
}

export function leadingEdgeX(span: number): number {
  return WING.rootLeadingEdgeX - Math.abs(span) * Math.tan(WING.sweep);
}

export function chordLineY(span: number): number {
  return WING.rootY + Math.abs(span) * Math.tan(WING.dihedral);
}

export function thicknessAt(span: number): number {
  return lerp(WING.thickness.root, WING.thickness.tip, spanShare(span));
}

export function wingSurfaceY(span: number, chordShare: number, upper: boolean): number {
  const chord = chordAt(span);
  const half = thicknessShape(chordShare) * thicknessAt(span) * chord;
  const camber = camberShape(chordShare) * WING.camber * chord;
  return chordLineY(span) + camber + (upper ? half : -half);
}

export function wingPoint(span: number, chordShare: number, upper: boolean): Vec3 {
  return [
    leadingEdgeX(span) - chordShare * chordAt(span),
    wingSurfaceY(span, chordShare, upper),
    span,
  ];
}

function wingStation(span: number, side: Side, round = false): Station {
  const { tipRound } = WING;
  const chord = chordAt(span) * (round ? tipRound.chord : 1);
  const setBack = round ? tipRound.setBack : 0;
  return {
    leadingEdge: [leadingEdgeX(span) - setBack, chordLineY(span), side * span],
    chordAxis: CHORD_AXIS,
    normalAxis: UP,
    chord,
    thickness: thicknessAt(span) * (round ? tipRound.thickness : 1),
    camber: WING.camber,
  };
}

export function wingPanel(
  side: Side,
  from: number,
  to: number,
  loop: readonly LoopPoint[],
): BufferGeometry {
  const reachesTip = to >= WING.halfSpan;
  const spans = reachesTip ? [from, to - WING.tipRound.span, to] : [from, to];
  const stations = spans.map((span, index) =>
    wingStation(span, side, reachesTip && index === spans.length - 1),
  );
  return airfoilSurface(stations, loop, spans.map(spanShare));
}

function finStation(
  root: Vec3,
  along: Vec3,
  distance: number,
  chord: number,
  sweep: number,
): Station {
  const across: Vec3 = [0, along[2], -along[1]];
  return {
    leadingEdge: [
      root[0] - distance * Math.tan(sweep),
      root[1] + along[1] * distance,
      root[2] + along[2] * distance,
    ],
    chordAxis: CHORD_AXIS,
    normalAxis: across,
    chord,
    thickness: TAIL.fin.thickness,
    camber: 0,
  };
}

export function finSurface(side: Side, loop: readonly LoopPoint[]): BufferGeometry {
  const { root, rootChord, tipChord, span, dihedral, sweep } = TAIL.fin;
  const along: Vec3 = [0, Math.sin(dihedral), side * Math.cos(dihedral)];
  const stations = [
    finStation(root, along, 0, rootChord, sweep),
    finStation(root, along, span, tipChord, sweep),
  ];
  return airfoilSurface(stations, loop);
}

export function finTip(side: Side): Vec3 {
  const { root, tipChord, span, dihedral, sweep } = TAIL.fin;
  return [
    root[0] - span * Math.tan(sweep) - tipChord / 2,
    root[1] + span * Math.sin(dihedral),
    side * span * Math.cos(dihedral),
  ];
}

export function ventralSurface(loop: readonly LoopPoint[]): BufferGeometry {
  const { root, rootChord, tipChord, depth, sweep } = TAIL.ventral;
  const down: Vec3 = [0, -1, 0];
  const station = (distance: number, chord: number): Station => ({
    ...finStation(root, down, distance, chord, sweep),
    thickness: TAIL.ventral.thickness,
  });
  return airfoilSurface([station(0, rootChord), station(depth, tipChord)], loop);
}
