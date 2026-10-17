import { BODY } from '../../parts/car/dimensions';
import { archEdges, isUnderArch } from './arches';
import { BODY_X, roundingStart } from './profile';

export interface StationDensity {
  open: number;
  arch: number;
  rounding: number;
  breakpoints: boolean;
}

const DETAILED_STATIONS: StationDensity = {
  open: 0.045,
  arch: 0.028,
  rounding: 8,
  breakpoints: true,
};

export const COARSE_STATIONS: StationDensity = {
  open: 0.24,
  arch: 0.14,
  rounding: 3,
  breakpoints: false,
};

const MERGE_GAP = 1e-6;

function roundingStations(sign: number, steps: number): number[] {
  const start = roundingStart(sign);
  const reach = sign * BODY.halfLength - start;
  return Array.from({ length: steps + 1 }, (_, step) => {
    const angle = (step / steps) * (Math.PI / 2);
    return start + reach * Math.sin(angle);
  });
}

function fill(from: number, to: number, density: StationDensity): number[] {
  const spacing = isUnderArch((from + to) / 2) ? density.arch : density.open;
  const steps = Math.max(1, Math.ceil((to - from) / spacing));
  return Array.from({ length: steps }, (_, step) => from + ((to - from) * step) / steps);
}

export function bodyStations(density: StationDensity = DETAILED_STATIONS): number[] {
  const tail = roundingStart(-1);
  const nose = roundingStart(1);
  const zones = density.breakpoints ? Object.values(BODY_X) : [];
  const breakpoints = [...zones, ...archEdges()];
  const breaks = ordered([...breakpoints.filter((x) => x > tail && x < nose), tail, nose]);
  const middle = breaks.slice(0, -1).flatMap((x, index) => fill(x, breaks[index + 1], density));
  const ends = breakpoints.filter((x) => x < tail || x > nose);
  return ordered([
    ...roundingStations(-1, density.rounding),
    ...middle,
    ...ends,
    ...roundingStations(1, density.rounding),
  ]);
}

function ordered(stations: readonly number[]): number[] {
  return [...stations]
    .sort((a, b) => a - b)
    .filter((x, index, all) => index === 0 || x - all[index - 1] > MERGE_GAP);
}
