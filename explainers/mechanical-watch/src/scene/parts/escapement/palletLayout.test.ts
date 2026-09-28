import { describe, expect, it } from 'vitest';
import { forkAngle } from '../../../model/kinematics';
import { BANKING_PIN, ESCAPE_TOOTH, IMPULSE_JEWEL } from '../../constants';
import type { Vec2 } from '../../geometry/outline';
import { distance, rotateAbout } from '../../geometry/outline';
import {
  BALANCE_IN_FORK,
  bankingPinsInFork,
  forkOutline,
  jewelInFork,
  restingToothDeg,
  slotBottom,
  stoneLayout,
} from './palletLayout';

const STAFF = { x: 0, y: 0 };
const ESCAPE = { x: -BALANCE_IN_FORK.x, y: 0 };
const BANKING_DEG = 5;
const AMPLITUDE_DEG = 280;
const STEP_DEG = 0.5;

function distanceToEdge(point: Vec2, outline: readonly Vec2[]): number {
  let best = Infinity;
  let inside = false;
  outline.forEach((a, index) => {
    const b = outline[(index + 1) % outline.length];
    if (a.y > point.y !== b.y > point.y) {
      const crossing = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
      if (point.x < crossing) inside = !inside;
    }
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(
      0,
      Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)),
    );
    best = Math.min(best, Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy));
  });
  return inside ? -best : best;
}

function fork(theta: number): number {
  return -forkAngle(theta);
}

describe('pallet fork layout', () => {
  const outline = forkOutline();

  it('holds the impulse jewel in the fork slot when the balance is at rest', () => {
    const jewel = jewelInFork(0, 0);
    expect(jewel.y).toBeCloseTo(0, 6);
    expect(jewel.x).toBeGreaterThan(slotBottom());
    expect(distanceToEdge(jewel, outline)).toBeGreaterThanOrEqual(IMPULSE_JEWEL.radius);
  });

  it('lets the impulse jewel swing a full turn without touching the fork', () => {
    for (let theta = -AMPLITUDE_DEG; theta <= AMPLITUDE_DEG; theta += STEP_DEG) {
      const clearance = distanceToEdge(jewelInFork(theta, fork(theta)), outline);
      expect(clearance, `balance at ${theta}`).toBeGreaterThanOrEqual(IMPULSE_JEWEL.radius);
    }
  });

  it('rests the lever on a banking pin at each end of its swing', () => {
    bankingPinsInFork().forEach((pin, index) => {
      const turn = index === 0 ? BANKING_DEG : -BANKING_DEG;
      const seen = rotateAbout(pin, STAFF, (-turn * Math.PI) / 180);
      expect(distanceToEdge(seen, outline)).toBeCloseTo(BANKING_PIN.radius, 2);
    });
  });

  it('locks a tooth on each stone just inside the tip circle', () => {
    (['exit', 'entry'] as const).forEach((id) => {
      const locked = id === 'exit' ? -BANKING_DEG : BANKING_DEG;
      const corner = rotateAbout(stoneLayout(id).lockingCorner, STAFF, (locked * Math.PI) / 180);
      const depth = ESCAPE_TOOTH.tipRadius - distance(corner, ESCAPE);
      expect(depth, id).toBeGreaterThan(0);
      expect(depth, id).toBeLessThan(0.06);
    });
  });

  it('rests a tooth on the exit stone at the start of the tick', () => {
    const exit = rotateAbout(
      stoneLayout('exit').lockingCorner,
      STAFF,
      (-BANKING_DEG * Math.PI) / 180,
    );
    const exitDeg = (Math.atan2(exit.y - ESCAPE.y, exit.x - ESCAPE.x) * 180) / Math.PI + 150;
    expect(Math.abs(restingToothDeg() - exitDeg)).toBeLessThan(2);
  });

  it('draws each locked stone deeper under tooth pressure', () => {
    (['exit', 'entry'] as const).forEach((id) => {
      const stone = stoneLayout(id);
      const push = { x: stone.face.y, y: -stone.face.x };
      const corner = stone.lockingCorner;
      const torque = corner.x * push.y - corner.y * push.x;
      expect(Math.sign(torque), id).toBe(id === 'exit' ? -1 : 1);
    });
  });
});
