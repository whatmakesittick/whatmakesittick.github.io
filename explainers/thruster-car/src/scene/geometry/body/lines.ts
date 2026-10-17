import type { BufferGeometry } from 'three';
import { BODY_X } from './profile';
import { VENT_ROWS } from './regions';
import { roundedPath, rowLine, stationLine, surfaceRibbon } from './ribbon';
import type { RibbonSpec } from './ribbon';
import { SEGMENT_CELLS } from './section';
import { spot } from './surface';
import type { BodySurface } from './surface';

export type LineFinish = 'frame' | 'lampFront';

const SHUT = { width: 0.005, lift: 0.0015, steps: 24 } as const;
const LAMP = { width: 0.024, lift: 0.003, steps: 32, frontX: 2.262 } as const;
const SLAT = { width: 0.012, lift: 0.004, steps: 8 } as const;
const HANDLE = { width: 0.028, lift: 0.002, from: -0.42, to: -0.27, height: 0.56 } as const;
const LID = {
  edge: 0.13,
  frontX: 2.13,
  rearX: -2.14,
  cowlGap: 0.01,
  deckGap: 0.02,
  round: 0.25,
} as const;
const FLAP = { from: -1.98, to: -1.86, low: 0.36, high: 0.6, round: 0.35 } as const;
const MIRRORS = [1, -1] as const;

function shutLines(): RibbonSpec[] {
  const from = spot('side', 0.03);
  const to = spot('belt', 0);
  const doors = [BODY_X.doorFront, BODY_X.doorRear].map((x) =>
    stationLine(x, from, to, SHUT.steps),
  );
  const edge = spot('crown', LID.edge);
  const centre = spot('crown', 1);
  const hood = roundedPath(
    [
      { at: [BODY_X.cowl + LID.cowlGap, edge], round: 0 },
      { at: [LID.frontX, edge], round: LID.round },
      { at: [LID.frontX, centre], round: 0 },
    ],
    false,
    SHUT.steps,
  );
  const deck = roundedPath(
    [
      { at: [BODY_X.deck - LID.deckGap, edge], round: 0 },
      { at: [LID.rearX, edge], round: LID.round },
      { at: [LID.rearX, centre], round: 0 },
    ],
    false,
    SHUT.steps,
  );
  return [...doors, hood, deck].map((path) => ({ path, width: SHUT.width, lift: SHUT.lift }));
}

function handle(): RibbonSpec {
  const path = rowLine(spot('shoulder', HANDLE.height), HANDLE.from, HANDLE.to, SHUT.steps);
  return { path, width: HANDLE.width, lift: HANDLE.lift };
}

function chargeFlap(): RibbonSpec {
  const [low, high] = [spot('shoulder', FLAP.low), spot('shoulder', FLAP.high)];
  const path = roundedPath(
    [
      { at: [FLAP.from, low], round: FLAP.round },
      { at: [FLAP.to, low], round: FLAP.round },
      { at: [FLAP.to, high], round: FLAP.round },
      { at: [FLAP.from, high], round: FLAP.round },
    ],
    true,
    SHUT.steps,
  );
  return { path, width: SHUT.width, lift: SHUT.lift, closed: true };
}

function rowsOf(cells: number, from: number, to: number): number[] {
  return Array.from({ length: to - from - 1 }, (_, index) => (from + index + 1) / cells);
}

function ventSlats(): RibbonSpec[] {
  const quarter = rowsOf(SEGMENT_CELLS.side, ...VENT_ROWS).map((u) =>
    rowLine(spot('side', u), BODY_X.ventRear, BODY_X.ventFront, SLAT.steps),
  );
  return quarter.map((path) => ({ path, width: SLAT.width, lift: SLAT.lift }));
}

function lampBar(x: number): RibbonSpec {
  const path = stationLine(x, spot('shoulder', 0.25), spot('crown', 1), LAMP.steps);
  return { path, width: LAMP.width, lift: LAMP.lift };
}

function ribbons(surface: BodySurface, specs: readonly RibbonSpec[]): BufferGeometry[] {
  return MIRRORS.flatMap((mirror) => specs.map((spec) => surfaceRibbon(surface, spec, mirror)));
}

export function bodyLines(surface: BodySurface): Map<LineFinish, BufferGeometry[]> {
  const frame = [
    ...ribbons(surface, [...shutLines(), ...ventSlats()]),
    surfaceRibbon(surface, handle(), -1),
    surfaceRibbon(surface, chargeFlap(), -1),
  ];
  return new Map<LineFinish, BufferGeometry[]>([
    ['frame', frame],
    ['lampFront', ribbons(surface, [lampBar(LAMP.frontX)])],
  ]);
}

export function rightDoorLines(surface: BodySurface): BufferGeometry[] {
  return [surfaceRibbon(surface, handle(), 1)];
}
