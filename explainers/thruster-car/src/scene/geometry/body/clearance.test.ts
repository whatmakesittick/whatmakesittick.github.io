import { describe, expect, it } from 'vitest';
import { NOZZLES, TANK } from '../../../model/layout';
import { ringReach } from './details';
import { BodySurface } from './surface';

const TANK_MARGIN = 0.03;
const STEP_X = 0.02;
const AROUND = 24;
const NOZZLE_EXIT_Z = 0.765;
const NOZZLE_TOLERANCE = 0.015;

const surface = new BodySurface();

function tankRim(x: number): number {
  const [centreX] = TANK.centre;
  const barrel = TANK.length / 2 - TANK.radius;
  const into = Math.max(0, Math.abs(x - centreX) - barrel);
  return Math.sqrt(Math.max(0, TANK.radius ** 2 - into ** 2));
}

function tankGaps(): number[] {
  const [centreX, centreY, centreZ] = TANK.centre;
  const half = TANK.length / 2;
  const gaps: number[] = [];
  for (let x = centreX - half; x <= centreX + half; x += STEP_X) {
    const rim = tankRim(x);
    for (let step = 0; step <= AROUND; step += 1) {
      const angle = (step / AROUND) * Math.PI;
      const y = centreY + rim * Math.sin(angle);
      const z = centreZ + rim * Math.cos(angle);
      gaps.push(ringReach(surface, x, y) - z);
    }
  }
  return gaps;
}

describe('body clearances', () => {
  it('keeps the tank inside the shell with room to spare', () => {
    expect(Math.min(...tankGaps())).toBeGreaterThan(TANK_MARGIN);
  });

  it('meets the front nozzle exits at the nose skin', () => {
    const [x, y] = NOZZLES.frontRight.at;
    expect(Math.abs(ringReach(surface, x, y) - NOZZLE_EXIT_Z)).toBeLessThan(NOZZLE_TOLERANCE);
  });
});
