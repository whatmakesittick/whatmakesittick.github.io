import { describe, expect, it } from 'vitest';
import { TRAIN } from '../../../../model';
import { LINE_DRAW } from '../../../constants';
import { wrapOffset } from '../../../pose';
import { CONTACT_WIRE_RISE, RAIL } from './constants';
import { CATENARY, RACK_REACH, SLEEPER, TRACK_PERIOD } from './track/constants';
import { evenCentres, sagAt, slotRange, slotsOf } from './track/slots';
import { bodySection, bodyStations } from './train/bodyShape';
import { BODY, CONSIST, NOSE } from './train/constants';
import { carSpans, kneePoint } from './train/layout';
import { halfRing, halfWidthAt, noseSection, rise, sectionPoint } from './train/section';
import { isWithinWindow } from './train/window';

const DIGITS = 6;
const RING = 15;
const OFFSET_SAMPLES = [0, 0.1, 0.5, 0.9, 0.999];

describe('ghost track slots', () => {
  it('covers the reach on both sides at every wrap offset', () => {
    [RACK_REACH.near, RACK_REACH.far].forEach((reach) => {
      const { first, last } = slotRange(reach, TRACK_PERIOD);
      OFFSET_SAMPLES.forEach((share) => {
        const offset = wrapOffset(share * TRACK_PERIOD, TRACK_PERIOD);
        expect(first * TRACK_PERIOD + offset).toBeLessThanOrEqual(-reach);
        expect((last + 1) * TRACK_PERIOD + offset).toBeGreaterThanOrEqual(reach);
      });
    });
  });

  it('leaves the near slots out of the far racks', () => {
    const near = slotRange(RACK_REACH.near, TRACK_PERIOD);
    const far = slotRange(RACK_REACH.far, TRACK_PERIOD);
    const outer = slotsOf(far, near);
    expect(outer.some((slot) => slot >= near.first && slot <= near.last)).toBe(false);
    expect(outer.length + slotsOf(near).length).toBe(slotsOf(far).length);
  });

  it('lays 80 sleepers 0.62 m apart in each 49.6 m period', () => {
    const centres = evenCentres(SLEEPER.perPeriod, TRACK_PERIOD);
    expect(TRACK_PERIOD).toBeCloseTo(49.6, DIGITS);
    expect(centres).toHaveLength(80);
    expect(centres[1] - centres[0]).toBeCloseTo(0.62, DIGITS);
    expect(centres[0] + centres[centres.length - 1]).toBeCloseTo(TRACK_PERIOD, DIGITS);
  });

  it('sags the messenger most in mid span and keeps every dropper above the contact wire', () => {
    expect(sagAt(0, CATENARY.sag)).toBe(0);
    expect(sagAt(1, CATENARY.sag)).toBe(0);
    expect(sagAt(0.5, CATENARY.sag)).toBeCloseTo(CATENARY.sag, DIGITS);
    CATENARY.dropperShares.forEach((share) =>
      expect(CATENARY.messengerY - sagAt(share, CATENARY.sag)).toBeGreaterThan(CATENARY.contactY),
    );
    expect(CATENARY.contactY - RAIL.top).toBeCloseTo(CONTACT_WIRE_RISE, DIGITS);
  });
});

describe('ghost train window', () => {
  it('shows the train while any part of it is inside the scenery', () => {
    const half = TRAIN.length / 2;
    expect(isWithinWindow(0, TRAIN.length, LINE_DRAW)).toBe(true);
    expect(isWithinWindow(-LINE_DRAW.behind - half + 1, TRAIN.length, LINE_DRAW)).toBe(true);
    expect(isWithinWindow(-LINE_DRAW.behind - half - 1, TRAIN.length, LINE_DRAW)).toBe(false);
    expect(isWithinWindow(LINE_DRAW.ahead + half + 1, TRAIN.length, LINE_DRAW)).toBe(false);
  });
});

describe('ghost train sections', () => {
  it('samples a ring from the roof centre down to the skirt centre', () => {
    const ring = halfRing(BODY, RING);
    expect(ring[0][0]).toBeCloseTo(0, DIGITS);
    expect(ring[0][1]).toBeCloseTo(BODY.top, DIGITS);
    expect(ring[RING - 1][0]).toBeCloseTo(0, DIGITS);
    expect(ring[RING - 1][1]).toBeCloseTo(BODY.bottom, DIGITS);
    expect(Math.max(...ring.map(([z]) => z))).toBeCloseTo(BODY.halfWidth, DIGITS);
  });

  it('measures the same half width as the ring at any height', () => {
    [0.3, 0.9, 1.2, 2.0, 2.5].forEach((theta) => {
      const [z, y] = sectionPoint(BODY, theta);
      expect(halfWidthAt(BODY, y)).toBeCloseTo(z, DIGITS);
    });
  });

  it('closes the nose to a point and grows it smoothly into the body', () => {
    const tip = noseSection(0, NOSE, BODY);
    expect(tip.halfWidth).toBe(0);
    expect(tip.top).toBeCloseTo(NOSE.tipY, DIGITS);
    expect(tip.bottom).toBeCloseTo(NOSE.tipY, DIGITS);
    const full = noseSection(NOSE.length, NOSE, BODY);
    expect(full).toEqual(expect.objectContaining({ halfWidth: BODY.halfWidth, top: BODY.top }));
    expect(full.bottom).toBeCloseTo(BODY.bottom, DIGITS);
    const widths = [1, 2, 4, 6, 8].map((d) => noseSection(d, NOSE, BODY).halfWidth);
    widths.slice(1).forEach((width, index) => expect(width).toBeGreaterThan(widths[index]));
    expect(rise(0.5, 2)).toBeCloseTo(Math.sqrt(0.75), DIGITS);
  });
});

describe('ghost train layout', () => {
  const cars = carSpans();

  it('strings eight cars over the length of the maglev with noses at both ends', () => {
    expect(cars).toHaveLength(CONSIST.cars);
    expect(cars[0].end).toBeCloseTo(TRAIN.length / 2, DIGITS);
    expect(cars[cars.length - 1].start).toBeCloseTo(-TRAIN.length / 2, DIGITS);
    expect(cars.map((car) => car.nose)).toEqual([
      'end',
      null,
      null,
      null,
      null,
      null,
      null,
      'start',
    ]);
    cars
      .slice(1)
      .forEach((car, index) =>
        expect(cars[index].start - car.end).toBeCloseTo(CONSIST.gap, DIGITS),
      );
  });

  it('lofts one body from nose to nose with a groove at every car joint', () => {
    const stations = bodyStations();
    expect(stations[0]).toBeCloseTo(-TRAIN.length / 2, DIGITS);
    expect(stations[stations.length - 1]).toBeCloseTo(TRAIN.length / 2, DIGITS);
    cars.forEach((car) => expect(bodySection((car.start + car.end) / 2)).toEqual(BODY));
    cars.slice(1).forEach((car, index) => {
      const joint = bodySection((car.end + cars[index].start) / 2);
      expect(joint.halfWidth).toBeLessThan(BODY.halfWidth);
      expect(joint.top).toBeLessThan(BODY.top);
    });
  });

  it('keeps both pantograph arms at their length', () => {
    const hinge = [0, 4.25] as const;
    const head = [0.1, 5.27] as const;
    const knee = kneePoint(hinge, head, 1.85, 1.75);
    expect(Math.hypot(knee[0] - hinge[0], knee[1] - hinge[1])).toBeCloseTo(1.85, DIGITS);
    expect(Math.hypot(knee[0] - head[0], knee[1] - head[1])).toBeCloseTo(1.75, DIGITS);
    expect(knee[0]).toBeGreaterThan(head[0]);
  });
});
