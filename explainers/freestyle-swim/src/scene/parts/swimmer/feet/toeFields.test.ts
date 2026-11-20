import { describe, expect, it } from 'vitest';
import { decodeFigure } from '@core/figure';
import { RestFrame } from '../garments/restFrame';
import { OFF_FOOT, TOES, TOE_CHANNELS, toeFields } from './toeFields';

const { athleteData } = await import('../figure/athlete.data');
const figure = decodeFigure(athleteData);
const frame = new RestFrame(figure);
const fields = toeFields(figure, frame);

const WIDTH_RANGE = [0.08, 0.12] as const;
const LENGTH_RANGE = [0.04, 0.08] as const;
const MIN_FOOT_VERTICES = 200;
const AXES = 3;

function alongOf(vertex: number): number {
  return fields.coordinates[vertex * TOE_CHANNELS];
}

describe('toe fields', () => {
  it('measures a plausible forefoot', () => {
    expect(fields.forefootWidth).toBeGreaterThan(WIDTH_RANGE[0]);
    expect(fields.forefootWidth).toBeLessThan(WIDTH_RANGE[1]);
    expect(fields.toeLength).toBeGreaterThan(LENGTH_RANGE[0]);
    expect(fields.toeLength).toBeLessThan(LENGTH_RANGE[1]);
    expect(fields.edges.high.base).toBeGreaterThan(fields.edges.low.base);
  });

  it('splits the forefoot into shares that sum to one', () => {
    expect(TOES.widthShares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(1, 10);
  });

  it('puts the toes beyond the ball and leaves the rest of the body off the foot', () => {
    const feet = Array.from({ length: figure.vertexCount }, (_, v) => v).filter(
      (v) => alongOf(v) !== OFF_FOOT,
    );
    expect(feet.length).toBeGreaterThan(MIN_FOOT_VERTICES);
    const furthest = Math.max(...feet.map(alongOf));
    expect(furthest).toBeCloseTo(fields.toeLength, 2);
    const headVertex = Array.from({ length: figure.vertexCount }, (_, v) => v).find(
      (v) => figure.restPositions[v * AXES + 1] > frame.joint('c_head').y,
    );
    expect(alongOf(headVertex as number)).toBe(OFF_FOOT);
  });
});
