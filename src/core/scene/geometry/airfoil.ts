import { ExtrudeGeometry, Shape, Vector2 } from 'three';
import type { BufferGeometry } from 'three';

export interface BladeSection {
  chord: number;
  thickness: number;
}

const NACA_SPREAD = 5;
const NACA_COEFFICIENTS = [0.2969, -0.126, -0.3516, 0.2843, -0.1036] as const;
const PITCH_AXIS_FRACTION = 0.25;

export const DEFAULT_AIRFOIL_SAMPLES = 10;

function halfThickness(fraction: number, thicknessRatio: number): number {
  const [root, linear, square, cube, quartic] = NACA_COEFFICIENTS;
  const polynomial =
    root * Math.sqrt(fraction) +
    linear * fraction +
    square * fraction ** 2 +
    cube * fraction ** 3 +
    quartic * fraction ** 4;
  return NACA_SPREAD * thicknessRatio * polynomial;
}

function airfoilShape({ chord, thickness }: BladeSection, samples: number): Shape {
  const leadingEdge = chord * PITCH_AXIS_FRACTION;
  const point = (fraction: number, side: number) =>
    new Vector2(leadingEdge - fraction * chord, side * chord * halfThickness(fraction, thickness));
  const fractions = Array.from(
    { length: samples + 1 },
    (_, index) => (1 - Math.cos((Math.PI * index) / samples)) / 2,
  );
  const upper = fractions.map((fraction) => point(fraction, 1));
  const lower = fractions
    .slice(1, -1)
    .reverse()
    .map((fraction) => point(fraction, -1));
  return new Shape([...upper, ...lower]);
}

export function bladeGeometry(
  section: BladeSection,
  from: number,
  to: number,
  samples = DEFAULT_AIRFOIL_SAMPLES,
): BufferGeometry {
  const geometry = new ExtrudeGeometry(airfoilShape(section, samples), {
    depth: to - from,
    bevelEnabled: false,
  });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(from, 0, 0);
  return geometry;
}
