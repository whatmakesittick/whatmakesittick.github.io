import type { Figure } from '@core/figure';

export function restPosed(figure: Figure): Figure {
  figure.pose(figure.createParameters());
  return Object.create(figure, { restPositions: { value: figure.positions.slice() } }) as Figure;
}
