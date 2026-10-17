import { BoxGeometry, CylinderGeometry, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { box } from '@core/scene/geometry/box';
import { mergeParts } from '../../parts/context';
import type { GroundLevel } from './pit';
import { sweptCrossSection } from './pit';
import { framePoint, rampFrame } from './rampFrame';
import type { RampFrame } from './rampFrame';
import { ribBack } from './rampSpec';
import { rampStations } from './stations';

export type SupportKind = 'trestle' | 'portal';

export interface Member {
  from: Vector3;
  to: Vector3;
  size: number;
  round: boolean;
}

export interface SupportPlan {
  members: Member[];
  footings: Vector3[];
  kinds: SupportKind[];
}

export const SUPPORT = {
  postAcross: 0.9,
  post: 0.12,
  leg: 0.16,
  beam: 0.18,
  tie: 0.12,
  hanger: 0.1,
  braceRadius: 0.03,
  braceSides: 6,
  portalHalfSpan: 2.5,
  beamOverhang: 0.15,
  clearance: 0.25,
  knee: 0.6,
  trestleMinUp: 0.12,
  minLength: 0.15,
  minCrossSpread: 0.6,
  reachU: 0.03,
  reachSamples: 6,
  footing: { half: 0.22, height: 0.14 },
} as const;

const SIDES = [-1, 1] as const;
const UP = new Vector3(0, 1, 0);
const rotation = new Quaternion();

interface Station {
  frame: RampFrame;
  kind: SupportKind;
  tops: Vector3[];
  feet: Vector3[];
}

function supportKind(frame: RampFrame): SupportKind {
  return frame.normal.y > SUPPORT.trestleMinUp ? 'trestle' : 'portal';
}

function member(from: Vector3, to: Vector3, size: number, round = false): Member {
  return { from, to, size, round };
}

function attachment(frame: RampFrame, across: number): Vector3 {
  return framePoint(frame, across, ribBack(across));
}

function standing(point: Vector3, ground: GroundLevel): Vector3 {
  return new Vector3(point.x, ground(point.x, point.z) + SUPPORT.footing.height, point.z);
}

function footingOf(foot: Vector3): Vector3 {
  return new Vector3(foot.x, foot.y - SUPPORT.footing.height, foot.z);
}

export function beamHeight(frame: RampFrame): number {
  const section = sweptCrossSection();
  let highest = -Infinity;
  for (let step = 0; step <= SUPPORT.reachSamples; step += 1) {
    const share = step / SUPPORT.reachSamples - 0.5;
    const near = rampFrame(Math.min(Math.max(frame.u + share * 2 * SUPPORT.reachU, 0), 1));
    section.forEach(([across, depth]) => {
      highest = Math.max(highest, framePoint(near, across, depth).y);
    });
  }
  return highest + SUPPORT.clearance + SUPPORT.beam / 2;
}

function trestle(frame: RampFrame, ground: GroundLevel, plan: SupportPlan): Station {
  const tops: Vector3[] = [];
  const feet: Vector3[] = [];
  SIDES.forEach((side) => {
    const top = attachment(frame, side * SUPPORT.postAcross);
    const foot = standing(top, ground);
    if (top.y - foot.y < SUPPORT.minLength) return;
    tops.push(top);
    feet.push(foot);
    plan.members.push(member(top, foot, SUPPORT.post));
    plan.footings.push(footingOf(foot));
  });
  if (tops.length === SIDES.length) crossBrace(tops, feet, plan);
  return { frame, kind: 'trestle', tops, feet };
}

function crossBrace(tops: Vector3[], feet: Vector3[], plan: SupportPlan): void {
  const spread = Math.hypot(tops[0].x - tops[1].x, tops[0].z - tops[1].z);
  if (spread < SUPPORT.minCrossSpread) return;
  plan.members.push(
    member(tops[0], feet[1], SUPPORT.braceRadius, true),
    member(tops[1], feet[0], SUPPORT.braceRadius, true),
  );
}

function portal(frame: RampFrame, ground: GroundLevel, plan: SupportPlan): Station {
  const height = beamHeight(frame);
  const spine = attachment(frame, 0);
  const x = spine.x;
  const { portalHalfSpan, beamOverhang, beam, knee } = SUPPORT;
  const tops = SIDES.map((side) => new Vector3(x, height, side * portalHalfSpan));
  const feet = tops.map((top) => standing(top, ground));
  tops.forEach((top, index) => {
    const side = SIDES[index];
    plan.members.push(
      member(feet[index], top.clone().setY(height + beam / 2), SUPPORT.leg),
      member(
        top.clone().setY(height - knee),
        new Vector3(x, height, side * (portalHalfSpan - knee)),
        SUPPORT.braceRadius,
        true,
      ),
    );
    plan.footings.push(footingOf(feet[index]));
  });
  const reach = portalHalfSpan + beamOverhang;
  plan.members.push(
    member(new Vector3(x, height, -reach), new Vector3(x, height, reach), beam),
    member(new Vector3(x, height - beam / 2, spine.z), spine, SUPPORT.hanger),
  );
  return { frame, kind: 'portal', tops, feet };
}

function connectTrestles(from: Station, to: Station, plan: SupportPlan): void {
  const count = Math.min(from.tops.length, to.feet.length);
  for (let index = 0; index < count; index += 1) {
    plan.members.push(member(from.tops[index], to.feet[index], SUPPORT.braceRadius, true));
  }
}

function connectPortals(from: Station, to: Station, plan: SupportPlan): void {
  from.tops.forEach((top, index) => {
    const next = to.tops[index];
    plan.members.push(
      member(top, next, SUPPORT.tie),
      member(from.feet[index], next.clone().setY(next.y - SUPPORT.knee), SUPPORT.braceRadius, true),
    );
  });
}

function connect(from: Station, to: Station, plan: SupportPlan): void {
  if (from.kind !== to.kind) return;
  if (from.kind === 'trestle') connectTrestles(from, to, plan);
  else connectPortals(from, to, plan);
}

export function supportPlan(ground: GroundLevel): SupportPlan {
  const plan: SupportPlan = { members: [], footings: [], kinds: [] };
  const stations = rampStations().map((frame) =>
    supportKind(frame) === 'trestle' ? trestle(frame, ground, plan) : portal(frame, ground, plan),
  );
  stations.forEach((station, index) => {
    plan.kinds.push(station.kind);
    if (index > 0) connect(stations[index - 1], station, plan);
  });
  return plan;
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

export function supportsGeometry(plan: SupportPlan): BufferGeometry {
  return mergeParts(plan.members.map(memberGeometry));
}

export function footingsGeometry(plan: SupportPlan): BufferGeometry[] {
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
