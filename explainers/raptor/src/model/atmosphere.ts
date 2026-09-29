export const SEA_LEVEL_PRESSURE_PA = 101325;

const PA_PER_BAR = 100000;

export const STANDARD_ATMOSPHERE: readonly (readonly [altitudeKm: number, pressurePa: number])[] = [
  [0, 101325],
  [5, 54048],
  [10, 26500],
  [20, 5529],
  [30, 1197],
  [40, 287.1],
  [50, 79.77],
  [60, 21.96],
  [70, 5.22],
  [80, 1.05],
];

function rowIndex(altitudeKm: number): number {
  const last = STANDARD_ATMOSPHERE.length - 2;
  let index = 0;
  while (index < last && altitudeKm > STANDARD_ATMOSPHERE[index + 1][0]) index += 1;
  return index;
}

export function airPressure(altitudeKm: number): number {
  const height = Math.max(0, altitudeKm);
  const index = rowIndex(height);
  const [h0, p0] = STANDARD_ATMOSPHERE[index];
  const [h1, p1] = STANDARD_ATMOSPHERE[index + 1];
  const slope = (Math.log(p1) - Math.log(p0)) / (h1 - h0);
  return Math.exp(Math.log(p0) + slope * (height - h0));
}

export function airPressureBar(altitudeKm: number): number {
  return airPressure(altitudeKm) / PA_PER_BAR;
}
