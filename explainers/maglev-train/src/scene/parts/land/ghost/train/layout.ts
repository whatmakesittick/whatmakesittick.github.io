import { BOGIE, CONSIST, PANTOGRAPH } from './constants';

export type NoseSide = 'start' | 'end' | null;

export interface CarSpan {
  readonly start: number;
  readonly end: number;
  readonly nose: NoseSide;
}

export interface Pantograph {
  readonly x: number;
  readonly raised: boolean;
}

function noseOf(index: number, count: number): NoseSide {
  if (index === 0) return 'end';
  if (index === count - 1) return 'start';
  return null;
}

export function carLengths(): number[] {
  const { length, cars, endCar, gap } = CONSIST;
  const middle = (length - 2 * endCar - (cars - 1) * gap) / (cars - 2);
  return Array.from({ length: cars }, (_, index) =>
    noseOf(index, cars) === null ? middle : endCar,
  );
}

export function carSpans(): CarSpan[] {
  const lengths = carLengths();
  return lengths.map((carLength, index) => {
    const ahead = lengths.slice(0, index).reduce((sum, value) => sum + value + CONSIST.gap, 0);
    const end = CONSIST.length / 2 - ahead;
    return { start: end - carLength, end, nose: noseOf(index, lengths.length) };
  });
}

export function junctionCentres(cars: readonly CarSpan[]): number[] {
  return cars.slice(1).map((car, index) => (car.end + cars[index].start) / 2);
}

export function bogieCentres(car: CarSpan): [number, number] {
  if (car.nose === 'end') return [car.start + BOGIE.endInset, car.end - BOGIE.noseInset];
  if (car.nose === 'start') return [car.start + BOGIE.noseInset, car.end - BOGIE.endInset];
  return [car.start + BOGIE.endInset, car.end - BOGIE.endInset];
}

export function pantographs(cars: readonly CarSpan[]): Pantograph[] {
  return PANTOGRAPH.cars.map((index) => {
    const car = cars[index];
    return {
      x: car.start + (car.end - car.start) * PANTOGRAPH.share,
      raised: index === PANTOGRAPH.raisedCar,
    };
  });
}

export function kneePoint(
  hinge: readonly [number, number],
  head: readonly [number, number],
  lower: number,
  upper: number,
): [number, number] {
  const dx = head[0] - hinge[0];
  const dy = head[1] - hinge[1];
  const distance = Math.hypot(dx, dy);
  const along = (lower ** 2 - upper ** 2 + distance ** 2) / (2 * distance);
  const across = Math.sqrt(Math.max(0, lower ** 2 - along ** 2));
  const [ux, uy] = [dx / distance, dy / distance];
  const [mx, my] = [hinge[0] + along * ux, hinge[1] + along * uy];
  const forward: [number, number] = [mx + across * uy, my - across * ux];
  const backward: [number, number] = [mx - across * uy, my + across * ux];
  return forward[0] >= backward[0] ? forward : backward;
}
