import { describe, expect, it } from 'vitest';
import { STREAM_IDS } from '../ids';
import {
  CHAMBER,
  CLUSTER,
  EXPANSION_RATIO,
  INJECTOR,
  NOZZLE_EXIT,
  PREBURNERS,
  STREAM_PATHS,
  THROAT,
  TURBOPUMPS,
  clusterEngines,
  wallRadius,
} from './layout';
import { ENGINE_EXTENT, contains } from './scale';

const WALL_STEP = 0.5;
const STREAM_Z_LIMIT = 12;

describe('wallRadius', () => {
  it('runs from the chamber through the throat to the exit', () => {
    expect(wallRadius(INJECTOR.y)).toBe(CHAMBER.radius);
    expect(wallRadius(CHAMBER.bottom)).toBeCloseTo(CHAMBER.radius, 9);
    expect(wallRadius(THROAT.y)).toBeCloseTo(THROAT.radius, 9);
    expect(wallRadius(NOZZLE_EXIT.y)).toBeCloseTo(NOZZLE_EXIT.radius, 6);
  });

  it('is narrowest at the throat and widens without a kink below it', () => {
    let previous = wallRadius(THROAT.y);
    for (let y = THROAT.y - WALL_STEP; y >= NOZZLE_EXIT.y; y -= WALL_STEP) {
      const radius = wallRadius(y);
      expect(radius).toBeGreaterThan(previous);
      previous = radius;
    }
    for (let y = CHAMBER.bottom; y >= THROAT.y; y -= WALL_STEP) {
      expect(wallRadius(y)).toBeGreaterThanOrEqual(THROAT.radius - 1e-9);
    }
  });

  it('gives an expansion ratio close to the published sea-level figure', () => {
    expect(EXPANSION_RATIO).toBeGreaterThan(33);
    expect(EXPANSION_RATIO).toBeLessThan(35);
  });
});

describe('powerhead', () => {
  it('keeps the pumps and preburners inside the engine, each burner hugging its pump', () => {
    for (const side of ['oxygen', 'methane'] as const) {
      const pump = TURBOPUMPS[side];
      const burner = PREBURNERS[side];
      expect(contains(ENGINE_EXTENT, pump.centre)).toBe(true);
      expect(contains(ENGINE_EXTENT, burner.centre)).toBe(true);
      const gap = Math.abs(pump.centre[0] - burner.centre[0]);
      expect(gap).toBeGreaterThan(pump.radius);
      expect(gap).toBeLessThan(pump.radius + burner.radius);
    }
  });

  it('puts the methane side at +x', () => {
    expect(TURBOPUMPS.methane.centre[0]).toBeGreaterThan(0);
    expect(TURBOPUMPS.oxygen.centre[0]).toBeLessThan(0);
  });
});

describe('stream paths', () => {
  it('gives every stream at least one path near the cut plane', () => {
    for (const id of STREAM_IDS) {
      expect(STREAM_PATHS[id].length).toBeGreaterThan(0);
      for (const path of STREAM_PATHS[id]) {
        expect(path.length).toBeGreaterThan(1);
        for (const point of path) {
          expect(Math.abs(point[2])).toBeLessThanOrEqual(STREAM_Z_LIMIT);
        }
      }
    }
  });

  it('joins each liquid to the preburner that starts its gas', () => {
    const [oxygenLiquid] = STREAM_PATHS.liquidOxygen;
    const [oxygenGas] = STREAM_PATHS.oxygenRichGas;
    expect(oxygenLiquid[oxygenLiquid.length - 1]).toEqual(oxygenGas[0]);
    const [methaneLiquid] = STREAM_PATHS.liquidMethane;
    const [methaneGas] = STREAM_PATHS.methaneRichGas;
    expect(methaneLiquid[methaneLiquid.length - 1]).toEqual(methaneGas[0]);
  });
});

describe('cluster', () => {
  const engines = clusterEngines();

  it('has 33 engines with the inner 13 steering', () => {
    expect(engines).toHaveLength(33);
    expect(engines.filter((engine) => engine.gimbals)).toHaveLength(13);
    expect(CLUSTER.map((ring) => ring.count)).toEqual([3, 10, 20]);
  });

  it('places the model engine in the centre ring at the origin', () => {
    const models = engines.filter((engine) => engine.isModelEngine);
    expect(models).toHaveLength(1);
    expect(models[0].ring).toBe('centre');
    expect(Math.hypot(models[0].position[0], models[0].position[2])).toBeLessThan(1e-6);
  });

  it('keeps neighbouring nozzles from overlapping much', () => {
    const minimum = 2 * NOZZLE_EXIT.radius - 2;
    engines.forEach((a, i) => {
      engines.slice(i + 1).forEach((b) => {
        const gap = Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);
        expect(gap).toBeGreaterThan(minimum);
      });
    });
  });
});
