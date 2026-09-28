import { describe, expect, it } from 'vitest';
import { CROWD, ELECTRON_FORM, OXYGEN_FORM } from '../constants';
import { seededRandom } from '../geometry/random';
import { createCrowd, isClear, poseCrowd } from './crowd';
import { poseElectron } from './electrons';
import { seatMolecules } from './molecules';
import { poseOxygen } from './oxygen';
import { beadPose } from './points';

describe('proton crowd', () => {
  const crowd = createCrowd([CROWD.below, CROWD.above], seededRandom(CROWD.seed));

  it('packs many more protons below the membrane than above it', () => {
    let below = 0;
    for (let index = 0; index < crowd.count; index += 1) {
      if (crowd.base[index * 3 + 1] < 0) below += 1;
    }
    expect(below).toBe(CROWD.below.count);
    expect(crowd.count - below).toBe(CROWD.above.count);
  });

  it('keeps clear of the motors and the pumps', () => {
    for (let index = 0; index < crowd.count; index += 1) {
      expect(isClear(crowd.base[index * 3], crowd.base[index * 3 + 2])).toBe(true);
    }
  });

  it('sways with the clock and holds still when calm', () => {
    const moving = poseCrowd(crowd, 0, 90, 0, beadPose()).position.x;
    const resting = poseCrowd(crowd, 0, 0, 0, beadPose()).position.x;
    expect(moving).not.toBeCloseTo(resting, 3);
    const calm = poseCrowd(crowd, 0, 90, 1, beadPose()).position.x;
    expect(calm).toBeCloseTo(crowd.base[0]);
  });
});

describe('electron chain', () => {
  it('hops from complex I to complex IV and fades at both ends', () => {
    const first = ELECTRON_FORM.stops[0];
    const last = ELECTRON_FORM.stops[ELECTRON_FORM.stops.length - 1];
    const start = poseElectron(0, beadPose());
    expect(start.position).toEqual(expect.objectContaining({ x: first.x, y: first.y }));
    expect(start.scale).toBe(0);
    const end = poseElectron(0.9999, beadPose());
    expect(end.position.x).toBeCloseTo(last.x, 1);
    expect(poseElectron(0.5, beadPose()).scale).toBe(1);
  });
});

describe('oxygen', () => {
  function pose() {
    const glyphs = seatMolecules();
    return { pair: glyphs.adp, waters: [glyphs.phosphate, glyphs.atp] as const };
  }

  it('brings the pair to complex IV and sends two waters away', () => {
    const arrived = poseOxygen(OXYGEN_FORM.arriveEnd, pose());
    expect(arrived.pair.position).toEqual(expect.objectContaining(OXYGEN_FORM.dock));
    const split = poseOxygen(0.9, pose());
    expect(split.pair.scale).toBe(0);
    split.waters.forEach((water) => expect(water.scale).toBeGreaterThan(0));
    expect(poseOxygen(null, pose()).pair.scale).toBe(0);
  });
});
