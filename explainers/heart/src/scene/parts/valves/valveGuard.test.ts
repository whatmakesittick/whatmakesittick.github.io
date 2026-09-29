import { describe, expect, it } from 'vitest';
import { VALVES } from '../../../model';
import { SHAPE_SPEC, VALVE_DESIGN, VALVE_DETAIL } from '../../constants';
import type { FlapValveDesign } from '../../constants';
import { heartShapes } from '../../geometry/heartShape';
import { flapColumns, flapVertexCount, writeFlap } from '../../geometry/leaflet';
import { ringFrame } from '../../geometry/valveFrame';
import { ringCentre } from '../../regions';
import { flapValve } from './valve';
import { guardField } from './valves';

const SHAPES = heartShapes(SHAPE_SPEC);
const TOLERANCE_MM = 0.35;
const OPENINGS = [0.5, 1];
const CASES = [
  ['mitral', guardField('mitral', SHAPES.sides.left)],
  ['tricuspid', guardField('tricuspid', SHAPES.sides.right)],
] as const;
const ANNULUS_BAND_MM = 5;

const MIN_MITRAL_OPENING_MM = 19;

describe('leaflets stay inside their cavity', () => {
  it('still opens the mitral into a wide oval', () => {
    const { normal, radius } = VALVES.mitral;
    const valve = flapValve(
      ringFrame(ringCentre('mitral'), normal, radius),
      VALVE_DESIGN.mitral as FlapValveDesign,
      guardField('mitral', SHAPES.sides.left),
    );
    const edgeMiddle = (leaflet: number) => {
      const positions = new Float32Array(flapVertexCount(valve, leaflet) * 3);
      writeFlap(valve, leaflet, 1, positions);
      const column = Math.round(flapColumns(valve, leaflet) / 2);
      const offset = (column * (valve.shape.rows + 1) + valve.shape.rows) * 3;
      return [positions[offset], positions[offset + 1], positions[offset + 2]];
    };
    const [anterior, posterior] = [edgeMiddle(0), edgeMiddle(1)];
    const gap = Math.hypot(anterior[0] - posterior[0], anterior[2] - posterior[2]);
    expect(gap).toBeGreaterThanOrEqual(MIN_MITRAL_OPENING_MM);
  });

  for (const [id, cavity] of CASES) {
    it(`keeps the open ${id} leaflets clear of the ventricle wall`, () => {
      const { normal, radius } = VALVES[id];
      const valve = flapValve(
        ringFrame(ringCentre(id), normal, radius),
        VALVE_DESIGN[id] as FlapValveDesign,
        cavity,
      );
      const rows = valve.shape.rows;
      let checked = 0;
      for (const opening of OPENINGS) {
        valve.leaflets.forEach((_, leaflet) => {
          const positions = new Float32Array(flapVertexCount(valve, leaflet) * 3);
          writeFlap(valve, leaflet, opening, positions);
          const columns = flapColumns(valve, leaflet);
          for (let column = 0; column <= columns; column += 1) {
            const hinge = column * (rows + 1) * 3;
            for (let row = 0; row <= rows; row += 1) {
              const offset = (column * (rows + 1) + row) * 3;
              const fromHinge = Math.hypot(
                positions[offset] - positions[hinge],
                positions[offset + 1] - positions[hinge + 1],
                positions[offset + 2] - positions[hinge + 2],
              );
              if (fromHinge < ANNULUS_BAND_MM) continue;
              const depth = cavity.distance(
                positions[offset],
                positions[offset + 1],
                positions[offset + 2],
              );
              expect(depth).toBeLessThanOrEqual(-VALVE_DETAIL.leafletClearanceMm + TOLERANCE_MM);
              checked += 1;
            }
          }
        });
      }
      expect(checked).toBeGreaterThan(400);
    });
  }
});
