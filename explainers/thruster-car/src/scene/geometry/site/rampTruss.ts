import { BoxGeometry, CylinderGeometry, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { box } from '@core/scene/geometry/box';
import { RAMP, RAMP_LENGTH } from '../../../model/layout';
import { mergeParts } from '../../parts/context';
import { framePoint, rampFrame } from './rampFrame';
import type { RampFrame } from './rampFrame';
import { DECK, INNER_CHORD, OUTER_CHORD, TRUSS } from './rampSpec';
import { rampStations } from './stations';
import { rampSweep, rectLoop, sweepCapped } from './sweep';

export type SupportKind = 'tower' | 'portal' | 'free';

export interface Member {
  from: Vector3;
  to: Vector3;
  size: number;
  round: boolean;
}

export interface TrussPlan {
  members: Member[];
  footings: Vector3[];
  kinds: SupportKind[];
  chordStart: number;
}

export const SUPPORT = {
  post: 0.12,
  leg: 0.15,
  beam: 0.16,
  tie: 0.1,
  web: 0.07,
  braceRadius: 0.028,
  braceSides: 6,
  portalHalfSpan: 2.6,
  portalEvery: 2,
  beamOverhang: 0.15,
  knee: 0.6,
  loopMargin: 0.35,
  minLength: 0.15,
  minCrossSpread: 0.6,
  reach: 0.15,
  reachSamples: 4,
  chordStep: 0.05,
  chordSections: 120,
  footing: { half: 0.22, height: 0.14 },
} as const;

export const LOOP_CENTRE = new Vector3(RAMP.entryX, RAMP.radius, 0);

const SIDES = [-1, 1] as const;
const UP = new Vector3(0, 1, 0);
const rotation = new Quaternion();

interface Station {
  kind: SupportKind;
  tops: Vector3[];
  feet: Vector3[];
}

function member(from: Vector3, to: Vector3, size: number, round = false): Member {
  return { from, to, size, round };
}

function brace(from: Vector3, to: Vector3): Member {
  return member(from, to, SUPPORT.braceRadius, true);
}

export function outerChordStart(): number {
  for (let distance = 0; distance < RAMP_LENGTH; distance += SUPPORT.chordStep) {
    if (framePoint(rampFrame(distance), 0, OUTER_CHORD).y >= TRUSS.groundClear) return distance;
  }
  return RAMP_LENGTH;
}

function chordPoints(frame: RampFrame, depth: number): Vector3[] {
  return SIDES.map((side) => framePoint(frame, side * TRUSS.halfWidth, depth));
}

export function standsClear(top: Vector3): boolean {
  if (top.x <= LOOP_CENTRE.x) return false;
  if (top.y <= LOOP_CENTRE.y) return true;
  return top.x - LOOP_CENTRE.x >= RAMP.radius + SUPPORT.loopMargin;
}

function onGround(point: Vector3): Vector3 {
  return new Vector3(point.x, SUPPORT.footing.height, point.z);
}

function footingOf(foot: Vector3): Vector3 {
  return new Vector3(foot.x, 0, foot.z);
}

function web(inner: Vector3[], outer: Vector3[], plan: TrussPlan): void {
  inner.forEach((point, index) => plan.members.push(member(point, outer[index], SUPPORT.web)));
  plan.members.push(member(outer[0], outer[1], SUPPORT.tie));
}

function bay(from: Station, to: Station, chords: Vector3[][][], plan: TrussPlan): void {
  const [innerFrom, outerFrom] = chords[0];
  const [, outerTo] = chords[1];
  if (outerFrom.length && outerTo.length) {
    SIDES.forEach((_, index) => plan.members.push(brace(innerFrom[index], outerTo[index])));
    plan.members.push(brace(outerFrom[0], outerTo[1]));
  }
  if (from.kind !== to.kind || from.kind === 'free') return;
  from.tops.forEach((top, index) => {
    const next = to.tops[index];
    if (from.kind === 'tower') plan.members.push(brace(top, to.feet[index]));
    else
      plan.members.push(
        member(top, next, SUPPORT.tie),
        brace(from.feet[index], next.clone().setY(next.y - SUPPORT.knee)),
      );
  });
}

function tower(tops: Vector3[], plan: TrussPlan): Station {
  const standing = tops.filter((top) => top.y - SUPPORT.footing.height > SUPPORT.minLength);
  const feet = standing.map(onGround);
  standing.forEach((top, index) => {
    plan.members.push(member(top, feet[index], SUPPORT.post));
    plan.footings.push(footingOf(feet[index]));
  });
  if (standing.length === SIDES.length && standing[0].y - feet[0].y > SUPPORT.minCrossSpread) {
    plan.members.push(brace(standing[0], feet[1]), brace(standing[1], feet[0]));
  }
  return { kind: 'tower', tops: standing, feet };
}

export function beamHeight(frame: RampFrame): number {
  let highest = -Infinity;
  for (let step = 0; step <= SUPPORT.reachSamples; step += 1) {
    const offset = (step / SUPPORT.reachSamples - 0.5) * 2 * SUPPORT.reach;
    const near = rampFrame(Math.min(Math.max(frame.distance + offset, 0), RAMP_LENGTH));
    [INNER_CHORD, OUTER_CHORD].forEach((depth) =>
      chordPoints(near, depth).forEach((point) => (highest = Math.max(highest, point.y))),
    );
  }
  return highest + TRUSS.chord / 2 + SUPPORT.beam / 2;
}

function portal(frame: RampFrame, x: number, plan: TrussPlan): Station {
  const height = beamHeight(frame);
  const { portalHalfSpan, beamOverhang, beam, knee } = SUPPORT;
  const tops = SIDES.map((side) => new Vector3(x, height, side * portalHalfSpan));
  const feet = tops.map(onGround);
  tops.forEach((top, index) => {
    const side = SIDES[index];
    plan.members.push(
      member(feet[index], top.clone().setY(height + beam / 2), SUPPORT.leg),
      brace(
        top.clone().setY(height - knee),
        new Vector3(x, height, side * (portalHalfSpan - knee)),
      ),
    );
    plan.footings.push(footingOf(feet[index]));
  });
  const reach = portalHalfSpan + beamOverhang;
  plan.members.push(member(new Vector3(x, height, -reach), new Vector3(x, height, reach), beam));
  return { kind: 'portal', tops, feet };
}

export function supportKinds(frames: readonly RampFrame[], chordStart: number): SupportKind[] {
  let portals = 0;
  return frames.map((frame, index) => {
    const depth = frame.distance >= chordStart ? OUTER_CHORD : INNER_CHORD;
    if (standsClear(framePoint(frame, 0, depth))) return 'tower';
    const due = portals % SUPPORT.portalEvery === 0 || index === frames.length - 1;
    portals += 1;
    return due ? 'portal' : 'free';
  });
}

function standUp(
  frame: RampFrame,
  kind: SupportKind,
  chords: Vector3[][],
  plan: TrussPlan,
): Station {
  const [inner, outer] = chords;
  const tops = outer.length ? outer : inner;
  if (kind === 'tower') return tower(tops, plan);
  if (kind === 'portal') return portal(frame, tops[0].x, plan);
  return { kind, tops: [], feet: [] };
}

export function trussPlan(): TrussPlan {
  const frames = rampStations();
  const chordStart = outerChordStart();
  const kinds = supportKinds(frames, chordStart);
  const plan: TrussPlan = { members: [], footings: [], kinds, chordStart };
  const chords = frames.map((frame) => [
    chordPoints(frame, INNER_CHORD),
    frame.distance >= chordStart ? chordPoints(frame, OUTER_CHORD) : [],
  ]);
  let previous: Station | null = null;
  frames.forEach((frame, index) => {
    const [inner, outer] = chords[index];
    if (outer.length) web(inner, outer, plan);
    const station = standUp(frame, kinds[index], chords[index], plan);
    if (previous) bay(previous, station, [chords[index - 1], chords[index]], plan);
    previous = station;
  });
  return plan;
}

function chordGeometry(depth: number, from: number): BufferGeometry {
  const sweep = rampSweep(SUPPORT.chordSections, from, RAMP_LENGTH);
  const half = TRUSS.chord / 2;
  return mergeParts(
    SIDES.map((side) =>
      sweepCapped(
        sweep,
        rectLoop({
          minAcross: side * TRUSS.halfWidth - half,
          maxAcross: side * TRUSS.halfWidth + half,
          minDepth: depth - half,
          maxDepth: depth + half,
        }),
        DECK.plateLength,
      ),
    ),
  );
}

function memberGeometry({ from, to, size, round }: Member): BufferGeometry {
  const span = new Vector3().subVectors(to, from);
  const length = span.length();
  const geometry = round
    ? new CylinderGeometry(size, size, length, SUPPORT.braceSides, 1, true)
    : new BoxGeometry(size, length, size);
  geometry.applyQuaternion(rotation.setFromUnitVectors(UP, span.normalize()));
  geometry.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
  return geometry;
}

export function trussGeometry(plan: TrussPlan): BufferGeometry {
  return mergeParts([
    chordGeometry(INNER_CHORD, 0),
    chordGeometry(OUTER_CHORD, plan.chordStart),
    ...plan.members.map(memberGeometry),
  ]);
}

export function footingsGeometry(plan: TrussPlan): BufferGeometry[] {
  const { half, height } = SUPPORT.footing;
  return plan.footings.map((at) =>
    box({
      minX: at.x - half,
      maxX: at.x + half,
      minY: at.y,
      maxY: at.y + height,
      minZ: at.z - half,
      maxZ: at.z + half,
    }),
  );
}
