import type { GroundPoint } from '../../../model/layout';
import type {
  Building,
  Farmstead,
  Field,
  FieldLayout,
  FieldPlan,
  GroundRules,
  Run,
} from './fieldPlan';
import { splitParcels } from './fieldSplit';
import type { Parcel } from './fieldSplit';
import { pointAlong } from './polygon';
import { between, seededRandom } from './random';
import type { Random } from './random';
import { FARMSTEAD_ROOFS } from './fieldConstants';
import { woodOutline } from './woodOutline';

const HALF = 0.5;
const MIDDLE_SHARES = [0, HALF, 1];
const FARM_ALONG: readonly [number, number] = [0.25, 0.75];

function runLength({ from, to }: Run): number {
  return Math.hypot(to[0] - from[0], to[1] - from[1]);
}

function toField(parcel: Parcel, plan: FieldPlan, rules: GroundRules, random: Random): Field {
  const wooded = parcel.corners.every(([x, z]) => rules.wooded(x, z)) && random() < plan.woodShare;
  return { ...parcel, wood: wooded ? woodOutline(parcel.corners) : undefined };
}

function hedgeRuns(boundary: Run, plan: FieldPlan, rules: GroundRules, random: Random): Run[] {
  const { run, gapChance, gap } = plan.hedge;
  const length = runLength(boundary);
  const runs: Run[] = [];
  let start = 0;
  while (start < length) {
    const end = Math.min(length, start + between(random, run));
    const piece = {
      from: pointAlong(boundary.from, boundary.to, start / length),
      to: pointAlong(boundary.from, boundary.to, end / length),
    };
    const hedged = MIDDLE_SHARES.every((share) =>
      rules.hedged(...pointAlong(piece.from, piece.to, share)),
    );
    if (hedged) runs.push(piece);
    start = end + (random() < gapChance ? between(random, gap) : 0);
  }
  return runs;
}

function pickTracks(boundaries: readonly Run[], plan: FieldPlan, random: Random): Set<Run> {
  const long = boundaries.filter((boundary) => runLength(boundary) >= plan.track.minLength);
  const stride = long.length / plan.track.count;
  const picks = Array.from(
    { length: Math.min(plan.track.count, long.length) },
    (_, index) => long[Math.floor((index + random()) * stride)],
  );
  return new Set(picks);
}

function building(random: Random, plan: FieldPlan): Building {
  const { length, width, spread } = plan.farmstead;
  return {
    centre: [(random() - HALF) * spread, (random() - HALF) * spread],
    length: between(random, length),
    width: between(random, width),
    roof: Math.floor(random() * FARMSTEAD_ROOFS.length),
  };
}

function farmstead(track: Run, plan: FieldPlan, random: Random): Farmstead {
  const { offset, yard, buildings } = plan.farmstead;
  const angle = Math.atan2(track.to[1] - track.from[1], track.to[0] - track.from[0]);
  const [x, z] = pointAlong(track.from, track.to, between(random, FARM_ALONG));
  const side = (random() < HALF ? -1 : 1) * between(random, offset);
  const centre: GroundPoint = [x - Math.sin(angle) * side, z + Math.cos(angle) * side];
  const count = Math.round(between(random, buildings));
  return {
    centre,
    angle,
    yard: [between(random, yard), between(random, yard)],
    buildings: Array.from({ length: count }, () => building(random, plan)),
  };
}

export function fieldLayout(plan: FieldPlan, rules: GroundRules): FieldLayout {
  const random = seededRandom(plan.seed);
  const { parcels, boundaries } = splitParcels(plan, random);
  const fields = parcels.map((parcel) => toField(parcel, plan, rules, random));
  const tracks = pickTracks(boundaries, plan, random);
  const hedges = boundaries
    .filter((boundary) => !tracks.has(boundary) && random() < plan.hedge.share)
    .flatMap((boundary) => hedgeRuns(boundary, plan, rules, random));
  const farmsteads = [...tracks]
    .filter(() => random() < plan.farmstead.share)
    .map((track) => farmstead(track, plan, random))
    .filter(({ centre }) => rules.wooded(...centre));
  return { fields, hedges, tracks: [...tracks], farmsteads, look: plan.look };
}
