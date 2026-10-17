import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DECK_END_X, LOOP_LENGTH, RAMP, RAMP_LENGTH, rampPoint } from '../../../model/layout';
import { deckBodyGeometry, deckSweep, deckTopGeometry } from './rampDeck';
import { rampFrame, rampFrames } from './rampFrame';
import type { RampFrame } from './rampFrame';
import { APRON, CLEARANCE, DECK, RAIL_TOP } from './rampSpec';
import { LOOP_CENTRE, SUPPORT, standsClear, trussPlan } from './rampTruss';
import type { Member } from './rampTruss';
import { STATION_SPACING, rampStations } from './stations';

const DIGITS = 4;
const SAMPLES = [0, 2, LOOP_LENGTH / 2, LOOP_LENGTH - 1, LOOP_LENGTH, LOOP_LENGTH + 4, RAMP_LENGTH];
const SLICES = 1200;
const MEMBER_SAMPLES = 24;
const TOLERANCE = 0.01;
const FALL_CLEAR_Z = 2.4;
const slices = rampFrames(SLICES);
const sliceHalf = RAMP_LENGTH / SLICES / 2;

function expectPoint(actual: Vector3, expected: readonly number[]): void {
  expect(actual.x).toBeCloseTo(expected[0], DIGITS);
  expect(actual.y).toBeCloseTo(expected[1], DIGITS);
  expect(actual.z).toBeCloseTo(expected[2], DIGITS);
}

function local(frame: RampFrame, point: Vector3) {
  const offset = new Vector3().subVectors(point, frame.centre);
  return {
    along: offset.dot(frame.tangent),
    across: Math.abs(offset.dot(frame.side)),
    depth: offset.dot(frame.normal),
  };
}

function clashes(point: Vector3, margin: number): boolean {
  return slices.some((frame) => {
    const { along, across, depth } = local(frame, point);
    if (Math.abs(along) > sliceHalf + margin) return false;
    const inCar =
      across < CLEARANCE.halfWidth + margin && depth > -margin && depth < CLEARANCE.height + margin;
    const inDeck =
      across < DECK.halfWidth + margin &&
      depth > -DECK.thickness + margin - TOLERANCE &&
      depth < RAIL_TOP + margin;
    return inCar || inDeck;
  });
}

function memberPoints(member: Member): Vector3[] {
  return Array.from({ length: MEMBER_SAMPLES + 1 }, (_, step) =>
    member.from.clone().lerp(member.to, step / MEMBER_SAMPLES),
  );
}

describe('hook ramp frame', () => {
  it('runs the deck centre along the ramp centre line', () => {
    SAMPLES.forEach((distance) => expectPoint(rampFrame(distance).centre, rampPoint(distance)));
  });

  it('turns the driving face from up, to the loop centre, to down', () => {
    expectPoint(rampFrame(0).normal, [0, 1, 0]);
    const side = rampFrame(LOOP_LENGTH / 2);
    const toCentre = new Vector3().subVectors(LOOP_CENTRE, side.centre).normalize();
    expectPoint(side.normal, toCentre.toArray());
    expectPoint(rampFrame(LOOP_LENGTH + 2).normal, [0, -1, 0]);
  });

  it('keeps the frame orthonormal with the side along z', () => {
    SAMPLES.forEach((distance) => {
      const { tangent, normal, side } = rampFrame(distance);
      expect(tangent.dot(normal)).toBeCloseTo(0, 6);
      expectPoint(side, [0, 0, 1]);
    });
  });
});

describe('hook ramp deck', () => {
  const sweep = deckSweep();
  const top = deckTopGeometry(sweep);
  const position = top.getAttribute('position');
  const normal = top.getAttribute('normal');

  it('lays the driving face through the centre line', () => {
    sweep.frames.forEach((frame, index) => {
      const left = new Vector3().fromBufferAttribute(position, index * 2);
      const right = new Vector3().fromBufferAttribute(position, index * 2 + 1);
      expectPoint(left.add(right).multiplyScalar(0.5), rampPoint(frame.distance));
    });
  });

  it('points the face normal up at the entry and down on the deck', () => {
    const last = (sweep.frames.length - 1) * 2;
    expectPoint(new Vector3().fromBufferAttribute(normal, 0), [0, 1, 0]);
    expectPoint(new Vector3().fromBufferAttribute(normal, last), [0, -1, 0]);
  });

  it('winds the triangles to face the way the normals point', () => {
    const index = top.getIndex();
    if (!index) throw new Error('Deck top is not indexed');
    const corners = [0, 1, 2].map(() => new Vector3());
    for (let face = 0; face < sweep.frames.length - 1; face += 1) {
      corners.forEach((corner, k) =>
        corner.fromBufferAttribute(position, index.getX(face * 6 + k)),
      );
      const facing = new Vector3()
        .subVectors(corners[1], corners[0])
        .cross(new Vector3().subVectors(corners[2], corners[0]));
      expect(
        facing.dot(new Vector3().fromBufferAttribute(normal, index.getX(face * 6))),
      ).toBeGreaterThan(0);
    }
  });

  it('starts with a lead-in apron and ends 10 m up at the deck end', () => {
    top.computeBoundingBox();
    expect(top.boundingBox?.min.x).toBeCloseTo(Math.min(APRON.from, DECK_END_X), 6);
    expect(top.boundingBox?.max.y).toBeCloseTo(RAMP.exitHeight, 3);
    expect(top.boundingBox?.max.x).toBeCloseTo(RAMP.entryX + RAMP.radius, 3);
  });

  it('keeps the deck body behind the driving face', () => {
    const body = deckBodyGeometry(sweep).getAttribute('position');
    for (let index = 0; index < body.count; index += 5) {
      const point = new Vector3().fromBufferAttribute(body, index);
      const nearest = slices.reduce((best, frame) =>
        frame.centre.distanceTo(point) < best.centre.distanceTo(point) ? frame : best,
      );
      expect(local(nearest, point).depth).toBeLessThan(TOLERANCE);
    }
  });
});

describe('hook ramp truss', () => {
  const plan = trussPlan();

  it('spaces the stations 1 to 1.5 m apart', () => {
    const stations = rampStations();
    for (let index = 1; index < stations.length; index += 1) {
      const gap = stations[index].distance - stations[index - 1].distance;
      expect(gap).toBeGreaterThan(1);
      expect(gap).toBeLessThan(1.5);
    }
    expect(STATION_SPACING).toBeGreaterThan(1);
  });

  it('stands towers behind the loop and portals over the top and the deck', () => {
    expect(plan.kinds[0]).toBe('tower');
    expect(plan.kinds.at(-1)).toBe('portal');
    expect(plan.kinds.filter((kind) => kind === 'portal').length).toBeGreaterThan(2);
    expect(standsClear(new Vector3(LOOP_CENTRE.x + 1, LOOP_CENTRE.y + 1, 0))).toBe(false);
  });

  it('keeps every member out of the deck and the car clearance', () => {
    plan.members.forEach((member) => {
      const margin = member.round ? member.size : member.size / 2;
      memberPoints(member).forEach((point) => expect(clashes(point, margin)).toBe(false));
    });
  });

  it('leaves the fall path below the deck end clear', () => {
    plan.members.forEach((member) =>
      memberPoints(member)
        .filter((point) => point.x < DECK_END_X - TOLERANCE)
        .forEach((point) => expect(Math.abs(point.z)).toBeGreaterThan(FALL_CLEAR_Z)),
    );
  });

  it('puts the portal legs outside 2.4 m either side', () => {
    plan.members
      .filter(
        (member) => !member.round && member.from.x === member.to.x && member.from.z === member.to.z,
      )
      .filter((member) => Math.abs(member.from.z) > 2)
      .forEach((member) =>
        expect(Math.abs(member.from.z) - member.size / 2).toBeGreaterThanOrEqual(FALL_CLEAR_Z),
      );
  });

  it('stands every member above the runway on footings', () => {
    plan.members.forEach((member) =>
      [member.from, member.to].forEach((end) => expect(end.y).toBeGreaterThan(-TOLERANCE)),
    );
    plan.footings.forEach((footing) => expect(footing.y).toBe(0));
    expect(plan.footings.length).toBeGreaterThan(8);
    expect(SUPPORT.portalHalfSpan).toBeGreaterThan(FALL_CLEAR_Z);
  });
});
