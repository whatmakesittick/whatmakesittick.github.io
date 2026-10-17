import { BODY } from '../../parts/car/dimensions';
import { archEdges, isUnderArch } from './arches';
import { BODY_X, roundingStart } from './profile';

const SPACING = { open: 0.045, arch: 0.028 } as const;
const ROUNDING_STEPS = 8;
const MERGE_GAP = 1e-6;

function roundingStations(sign: number): number[] {
  const start = roundingStart(sign);
  const reach = sign * BODY.halfLength - start;
  return Array.from({ length: ROUNDING_STEPS + 1 }, (_, step) => {
    const angle = (step / ROUNDING_STEPS) * (Math.PI / 2);
    return start + reach * Math.sin(angle);
  });
}

function fill(from: number, to: number): number[] {
  const spacing = isUnderArch((from + to) / 2) ? SPACING.arch : SPACING.open;
  const steps = Math.max(1, Math.ceil((to - from) / spacing));
  return Array.from({ length: steps }, (_, step) => from + ((to - from) * step) / steps);
}

export function bodyStations(): number[] {
  const tail = roundingStart(-1);
  const nose = roundingStart(1);
  const breaks = [...Object.values(BODY_X), ...archEdges()]
    .filter((x) => x > tail && x < nose)
    .concat(tail, nose)
    .sort((a, b) => a - b)
    .filter((x, index, all) => index === 0 || x - all[index - 1] > MERGE_GAP);
  const middle = breaks.slice(0, -1).flatMap((x, index) => fill(x, breaks[index + 1]));
  return [...roundingStations(-1).reverse(), ...middle.slice(1), ...roundingStations(1)];
}
