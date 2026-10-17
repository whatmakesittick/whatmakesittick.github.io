import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { RAMP, SITE, rampPoint } from '../../../model/layout';
import { groundLevel, insidePit, rampPit, sunkenPoints } from './pit';
import { deckBodyGeometry, deckSweep, deckTopGeometry } from './rampDeck';
import { rampFrame, rampLocal, rampSurfacePoint } from './rampFrame';
import { CLEARANCE, DECK, RAIL_TOP } from './rampSpec';
import { SUPPORT, supportPlan } from './rampSupports';
import type { Member } from './rampSupports';
import { rampStations, STATION_SPACING } from './stations';

const SAMPLES = [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1];
const MEMBER_SAMPLES = 24;
const TOLERANCE = 0.01;

const DIGITS = 4;

function expectPoint(actual: Vector3, expected: readonly number[]): void {
  expect(actual.x).toBeCloseTo(expected[0], DIGITS);
  expect(actual.y).toBeCloseTo(expected[1], DIGITS);
  expect(actual.z).toBeCloseTo(expected[2], DIGITS);
}

function memberPoints(member: Member): Vector3[] {
  return Array.from({ length: MEMBER_SAMPLES + 1 }, (_, step) =>
    member.from.clone().lerp(member.to, step / MEMBER_SAMPLES),
  );
}

function clashes(point: Vector3, margin: number): boolean {
  const local = rampLocal(point);
  if (!local) return false;
  const across = Math.abs(local.across);
  const inCar =
    across < CLEARANCE.halfWidth + margin &&
    local.depth > -margin &&
    local.depth < CLEARANCE.height + margin;
  const inDeck =
    across < DECK.halfWidth + margin &&
    local.depth > -DECK.thickness + margin - TOLERANCE * 2 &&
    local.depth < RAIL_TOP + margin;
  return inCar || inDeck;
}

describe('ramp frame', () => {
  it('runs the ribbon centre along the ramp centre line', () => {
    SAMPLES.forEach((u) => expectPoint(rampFrame(u).centre, rampPoint(u)));
  });

  it('faces the driving face up at the entry and down at the exit', () => {
    expectPoint(rampFrame(0).normal, [0, 1, 0]);
    expect(rampFrame(1).normal.y).toBeLessThan(-0.7);
    expect(rampFrame(1).normal.z).toBeCloseTo(0, 6);
  });

  it('drops the right edge first', () => {
    const left = rampSurfacePoint(0.5, -DECK.halfWidth);
    const right = rampSurfacePoint(0.5, DECK.halfWidth);
    expect(right.y).toBeLessThan(left.y);
    expect(rampSurfacePoint(0.2, DECK.halfWidth).y).toBeLessThan(rampPoint(0.2)[1]);
  });

  it('keeps the frame orthonormal', () => {
    SAMPLES.forEach((u) => {
      const { tangent, normal, side } = rampFrame(u);
      expect(tangent.dot(normal)).toBeCloseTo(0, 6);
      expect(tangent.dot(side)).toBeCloseTo(0, 6);
      expect(new Vector3().crossVectors(tangent, normal).dot(side)).toBeCloseTo(1, 6);
    });
  });

  it('reads a point back into the ramp frame', () => {
    const point = rampSurfacePoint(0.37, 0.6, -0.2);
    const local = rampLocal(point);
    expect(local?.u).toBeCloseTo(0.37, 4);
    expect(local?.across).toBeCloseTo(0.6, 4);
    expect(local?.depth).toBeCloseTo(-0.2, 4);
  });
});

describe('ramp deck', () => {
  const sweep = deckSweep();
  const top = deckTopGeometry(sweep);
  const position = top.getAttribute('position');
  const normal = top.getAttribute('normal');

  it('lays the driving face through the centre line', () => {
    sweep.frames.forEach((frame, index) => {
      const left = new Vector3().fromBufferAttribute(position, index * 2);
      const right = new Vector3().fromBufferAttribute(position, index * 2 + 1);
      expectPoint(left.add(right).multiplyScalar(0.5), rampPoint(frame.u));
    });
  });

  it('turns the face normal from up at the entry to down at the exit', () => {
    const last = (sweep.frames.length - 1) * 2;
    expectPoint(new Vector3().fromBufferAttribute(normal, 0), [0, 1, 0]);
    expect(new Vector3().fromBufferAttribute(normal, last).y).toBeLessThan(-0.7);
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
      const expected = new Vector3().fromBufferAttribute(normal, index.getX(face * 6));
      expect(facing.dot(expected)).toBeGreaterThan(0);
    }
  });

  it('starts the lead-in apron on the ground before the entry', () => {
    top.computeBoundingBox();
    expect(top.boundingBox?.min.x).toBeCloseTo(22, 6);
    expect(top.boundingBox?.max.y).toBeCloseTo(RAMP.exitHeight + DECK.halfWidth * 0, 1);
  });

  it('keeps the deck body behind the driving face', () => {
    const body = deckBodyGeometry(sweep).getAttribute('position');
    for (let index = 0; index < body.count; index += 7) {
      const local = rampLocal(new Vector3().fromBufferAttribute(body, index));
      if (local) expect(local.depth).toBeLessThan(TOLERANCE);
    }
  });
});

describe('ramp pit', () => {
  const pit = rampPit();

  it('digs a pit where the twisted deck and the car dip below the runway', () => {
    expect(pit).not.toBeNull();
    sunkenPoints().forEach((point) => {
      expect(insidePit(pit, point.x, point.z)).toBe(true);
      expect(point.y).toBeGreaterThan(pit?.floor ?? 0);
    });
  });

  it('stays inside the runway and clear of the portal legs', () => {
    if (!pit) throw new Error('No pit');
    expect(pit.x[0]).toBeGreaterThan(SITE.run.x[0]);
    expect(pit.x[1]).toBeLessThan(RAMP.entryX + RAMP.lengthX);
    expect(pit.z[0]).toBeGreaterThan(-SUPPORT.portalHalfSpan + SUPPORT.leg);
    expect(pit.z[1]).toBeLessThan(SUPPORT.portalHalfSpan - SUPPORT.leg);
  });
});

describe('ramp supports', () => {
  const plan = supportPlan(groundLevel(rampPit()));

  it('spaces the stations 1 to 1.5 m apart', () => {
    const stations = rampStations();
    for (let index = 1; index < stations.length; index += 1) {
      const gap = stations[index].centre.distanceTo(stations[index - 1].centre);
      expect(gap).toBeGreaterThan(1);
      expect(gap).toBeLessThan(1.5);
    }
    expect(STATION_SPACING).toBeGreaterThan(1);
  });

  it('stands trestles where the back faces down and portals where it faces up', () => {
    const stations = rampStations();
    plan.kinds.forEach((kind, index) => {
      expect(kind).toBe(stations[index].normal.y > SUPPORT.trestleMinUp ? 'trestle' : 'portal');
      if (kind === 'trestle') expect(stations[index].normal.y).toBeGreaterThan(0);
    });
    expect(plan.kinds[0]).toBe('trestle');
    expect(plan.kinds[plan.kinds.length - 1]).toBe('portal');
  });

  it('keeps every member out of the deck and the car clearance', () => {
    plan.members.forEach((member) => {
      const margin = member.round ? member.size : member.size / 2;
      memberPoints(member).forEach((point) => expect(clashes(point, margin)).toBe(false));
    });
  });

  it('puts the portal legs outside 2.4 m either side', () => {
    const legs = plan.members.filter(
      (member) => !member.round && member.from.x === member.to.x && member.from.z === member.to.z,
    );
    legs
      .filter((member) => Math.abs(member.from.z) > 2)
      .forEach((member) =>
        expect(Math.abs(member.from.z) - member.size / 2).toBeGreaterThanOrEqual(2.4),
      );
  });

  it('stands every footing on the runway or the pit floor', () => {
    const ground = groundLevel(rampPit());
    plan.footings.forEach((footing) =>
      expect(footing.y).toBeCloseTo(ground(footing.x, footing.z), 6),
    );
  });
});
