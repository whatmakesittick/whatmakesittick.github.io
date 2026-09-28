import { describe, expect, it } from 'vitest';
import { VALVES } from '../../model';
import { bloodPath } from './bloodPath';
import { arterialRoutes, venousRoutes } from './bloodRoutes';

const STYLE = { depthMm: 4, chamberSpread: 0.5, vesselSpread: 0.6 };

describe('blood routes', () => {
  it('runs four venous routes through the right heart to the lungs', () => {
    const routes = venousRoutes(STYLE);
    expect(routes).toHaveLength(4);
    for (const legs of routes) {
      const path = bloodPath(legs);
      expect(path.gates.atrium).toBeGreaterThan(0);
      expect(path.gates.artery).toBeLessThan(path.length);
      const [x] = legs[2].points[0];
      expect(x).toBe(VALVES.tricuspid.centre[0]);
    }
  });

  it('runs four arterial routes through the left heart to the body', () => {
    const routes = arterialRoutes(STYLE);
    expect(routes).toHaveLength(4);
    for (const legs of routes) {
      const path = bloodPath(legs);
      expect(path.gates.artery).toBeGreaterThan(path.gates.ventricle);
      expect(legs[legs.length - 1].zone).toBe('artery');
    }
  });

  it('keeps chamber stretches behind the cut plane', () => {
    for (const legs of [...venousRoutes(STYLE), ...arterialRoutes(STYLE)]) {
      for (const leg of legs.filter((candidate) => candidate.chamber)) {
        for (const point of leg.points) expect(point[2]).toBeLessThanOrEqual(-STYLE.depthMm);
      }
    }
  });
});
