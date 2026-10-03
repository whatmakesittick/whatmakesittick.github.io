import { clamp, lerp, smoothstep } from '@core/math';
import {
  FAIRING,
  HULL_DETAIL,
  HULL_STATIONS,
  JET,
  STEM,
  TRANSOM_X,
  chineHeight,
  stemXAt,
} from '../../model/layout';
import type { HullStation } from '../../model/layout';
import { HULL_LINES } from '../constants';
import { mergeSorted, monotoneCubic, spread } from './curves';

export type Pair = readonly [z: number, y: number];

export interface HullSection {
  x: number;
  keel: number;
  intake: Pair;
  chine: Pair;
  flat: Pair;
  knuckle: Pair;
  rail: number;
  sheer: Pair;
  split: Pair;
  panelEdge: Pair;
  deck: number;
}

const BOW_X = STEM.top[0];
const STATION_XS = HULL_STATIONS.map((station) => station.x);
const CHINE_END_X = stemXAt(STEM.chineMeetsAt);
const KNUCKLE_END_X = HULL_DETAIL.knuckleMergeX;

export function stemYAt(x: number): number {
  const [x0, y0] = STEM.forefoot;
  const [x1, y1] = STEM.top;
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
}

function mergingLine(
  value: (station: HullStation) => number,
  endX: number,
  endValue: number,
): (x: number) => number {
  return monotoneCubic([...STATION_XS, endX], [...HULL_STATIONS.map(value), endValue]);
}

const keelCurve = (() => {
  const aft = HULL_STATIONS.filter((station) => station.x <= HULL_LINES.keelCurveTo);
  const knots: [number, number][] = [
    ...aft.map((station): [number, number] => [station.x, station.keel]),
    [HULL_DETAIL.keelStraightTo, aft[0].keel],
    [STEM.forefoot[0], STEM.forefoot[1]],
    [HULL_LINES.stemBlend[1], stemYAt(HULL_LINES.stemBlend[1])],
  ];
  knots.sort((a, b) => a[0] - b[0]);
  return monotoneCubic(
    knots.map(([x]) => x),
    knots.map(([, y]) => y),
  );
})();

const chineZ = mergingLine((station) => station.chineHalfBreadth, CHINE_END_X, 0);
const chineY = mergingLine(chineHeight, CHINE_END_X, STEM.chineMeetsAt);
const sheerZ = mergingLine((station) => station.sheer[0], BOW_X, 0);
const sheerY = mergingLine((station) => station.sheer[1], BOW_X, STEM.top[1]);
const deckY = mergingLine((station) => station.deck, BOW_X, STEM.top[1]);
const knuckleZ = mergingLine((station) => station.knuckle[0], KNUCKLE_END_X, sheerZ(KNUCKLE_END_X));
const knuckleY = mergingLine((station) => station.knuckle[1], KNUCKLE_END_X, sheerY(KNUCKLE_END_X));

export function keelAt(x: number): number {
  const [from, to] = HULL_LINES.stemBlend;
  if (x >= to) return stemYAt(x);
  return lerp(keelCurve(x), stemYAt(x), smoothstep(x, from, to));
}

function softMin(a: number, b: number): number {
  const k = HULL_LINES.softness;
  return -k * Math.log(Math.exp(-a / k) + Math.exp(-b / k));
}

function onBottom(keel: number, chine: Pair, z: number): Pair {
  return [z, keel + ((chine[1] - keel) * z) / Math.max(chine[0], HULL_LINES.epsilon)];
}

function taper(x: number, [from, to]: readonly [number, number], ramp: number): number {
  return smoothstep(x, from, from + ramp) * (1 - smoothstep(x, to - ramp, to));
}

export function hullSectionAt(xAt: number): HullSection {
  const x = clamp(xAt, TRANSOM_X, BOW_X);
  const keel = keelAt(x);
  const stem = stemYAt(x);
  const chine: Pair = x >= CHINE_END_X ? [0, stem] : [chineZ(x), chineY(x)];
  const sheer: Pair = [sheerZ(x), sheerY(x)];
  const knuckle: Pair = x >= KNUCKLE_END_X ? sheer : [knuckleZ(x), knuckleY(x)];
  const deck = deckY(x);
  const flatWidth =
    HULL_DETAIL.chineFlat.width *
    (1 - smoothstep(x, HULL_LINES.flatTaperFrom, HULL_DETAIL.chineFlat.endX));
  const panelZ = softMin(HULL_DETAIL.deckCentreWidth / 2, HULL_LINES.panelShare * sheer[0]);
  const splitShare = clamp(
    (FAIRING.baseHalfWidth - panelZ) / Math.max(sheer[0] - panelZ, HULL_LINES.epsilon),
    0,
    1,
  );
  return {
    x,
    keel,
    intake: onBottom(keel, chine, Math.min(JET.intake.halfWidth, chine[0] / 2)),
    chine,
    flat: [chine[0] + flatWidth, chine[1]],
    knuckle,
    rail: HULL_DETAIL.sprayRail.width * taper(x, HULL_DETAIL.sprayRail.x, HULL_LINES.railTaper),
    sheer,
    split: [lerp(panelZ, sheer[0], splitShare), lerp(deck, sheer[1], splitShare)],
    panelEdge: [panelZ, deck],
    deck,
  };
}

export function deckYAt(x: number, z: number): number {
  const section = hullSectionAt(x);
  const [edgeZ] = section.panelEdge;
  const across = Math.abs(z);
  if (across <= edgeZ) return section.deck;
  const share = clamp(
    (across - edgeZ) / Math.max(section.sheer[0] - edgeZ, HULL_LINES.epsilon),
    0,
    1,
  );
  return lerp(section.deck, section.sheer[1], share);
}

export function bottomYAt(x: number, z: number): number {
  const section = hullSectionAt(x);
  return onBottom(section.keel, section.chine, Math.abs(z))[1];
}

function along(from: Pair, to: Pair, y: number): number {
  const share = clamp((y - from[1]) / Math.max(to[1] - from[1], HULL_LINES.epsilon), 0, 1);
  return lerp(from[0], to[0], share);
}

export function halfBreadthAt(x: number, y: number): number {
  if (x < TRANSOM_X || x > BOW_X) return 0;
  const section = hullSectionAt(x);
  if (y <= section.keel) return 0;
  if (y <= section.chine[1]) return along([0, section.keel], section.chine, y);
  if (y <= section.knuckle[1]) return along(section.flat, section.knuckle, y);
  if (y <= section.sheer[1]) return along(section.knuckle, section.sheer, y);
  return section.sheer[0];
}

export function outerProfile(section: HullSection): Pair[] {
  return [
    [0, section.keel],
    section.intake,
    section.chine,
    section.flat,
    section.knuckle,
    section.sheer,
    section.split,
    section.panelEdge,
    [0, section.deck],
  ];
}

export function hullStationXs(): number[] {
  const { aftSpacing, bowFrom, bowSpacing, tolerance } = HULL_LINES.stations;
  const aft = spread(TRANSOM_X, bowFrom, Math.round((bowFrom - TRANSOM_X) / aftSpacing));
  const bow = spread(bowFrom, BOW_X, Math.round((BOW_X - bowFrom) / bowSpacing));
  const special = [
    ...JET.intake.x,
    ...FAIRING.x,
    FAIRING.frontTopX,
    ...HULL_DETAIL.sprayRail.x,
    HULL_DETAIL.chineFlat.endX,
    HULL_LINES.cutX,
    KNUCKLE_END_X,
    CHINE_END_X,
    ...HULL_LINES.stemBlend,
  ];
  const regular = [...aft, ...bow].filter((x) =>
    special.every((value) => Math.abs(x - value) > tolerance),
  );
  return mergeSorted([...special, ...regular], tolerance);
}
