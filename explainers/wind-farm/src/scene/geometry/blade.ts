import { BufferGeometry, Float32BufferAttribute } from 'three';
import { clamp, lerp, smoothstep } from '@core/math';
import { TURBINE_GEOMETRY } from '../../model/layout';
import { ROTOR_RADIUS_M } from '../../model/constants';

const NACA = { spread: 5, coefficients: [0.2969, -0.126, -0.3516, 0.2843, -0.1036] } as const;

export const BLADE = {
  rootRadius: TURBINE_GEOMETRY.bladeRootRadius,
  tipRadius: ROTOR_RADIUS_M,
  rootDiameter: 2.2,
  maxChord: 4.2,
  maxChordShare: 0.2,
  tipChord: 0.6,
  cylinderShare: 0.03,
  airfoilShare: 0.16,
  rootTwistDeg: 13,
  twistStartShare: 0.1,
  pitchAxisShare: 0.33,
  tipRoundShare: 0.965,
  tipFloor: 0.2,
  spanSections: 40,
  aroundSections: 24,
  band: { from: 0.86, to: 0.9 },
} as const;

const THICKNESS = { root: 0.6, maxChord: 0.4, tip: 0.18, falloff: 1.8 } as const;
const CHORD_FALLOFF = 1.25;

function halfThickness(fraction: number, ratio: number): number {
  const [root, linear, square, cube, quartic] = NACA.coefficients;
  const polynomial =
    root * Math.sqrt(fraction) +
    linear * fraction +
    square * fraction ** 2 +
    cube * fraction ** 3 +
    quartic * fraction ** 4;
  return NACA.spread * ratio * polynomial;
}

function outboardShare(share: number): number {
  return clamp((1 - share) / (1 - BLADE.maxChordShare), 0, 1);
}

export function bladeChord(share: number): number {
  if (share <= BLADE.maxChordShare) {
    const grow = smoothstep(share, BLADE.cylinderShare, BLADE.maxChordShare);
    return lerp(BLADE.rootDiameter, BLADE.maxChord, grow);
  }
  const taper = outboardShare(share) ** CHORD_FALLOFF;
  const chord = BLADE.tipChord + (BLADE.maxChord - BLADE.tipChord) * taper;
  const tip = clamp((share - BLADE.tipRoundShare) / (1 - BLADE.tipRoundShare), 0, 1);
  return chord * Math.max(BLADE.tipFloor, Math.sqrt(1 - tip * tip));
}

export function bladeThickness(share: number): number {
  if (share <= BLADE.maxChordShare) {
    return lerp(THICKNESS.root, THICKNESS.maxChord, share / BLADE.maxChordShare);
  }
  const fall = outboardShare(share) ** THICKNESS.falloff;
  return THICKNESS.tip + (THICKNESS.maxChord - THICKNESS.tip) * fall;
}

export function bladeTwist(share: number): number {
  const along = clamp((share - BLADE.twistStartShare) / (1 - BLADE.twistStartShare), 0, 1);
  return ((BLADE.rootTwistDeg * Math.PI) / 180) * (1 - along) ** 1.5;
}

function spanShare(section: number): number {
  return (1 - Math.cos((Math.PI * section) / BLADE.spanSections)) / 2;
}

function sectionRing(share: number): number[] {
  const radius = lerp(BLADE.rootRadius, BLADE.tipRadius, share);
  const chord = bladeChord(share);
  const ratio = bladeThickness(share);
  const twist = bladeTwist(share);
  const airfoil = smoothstep(share, BLADE.cylinderShare, BLADE.airfoilShare);
  const circle = BLADE.rootDiameter / 2;
  return Array.from({ length: BLADE.aroundSections }, (_, step) => {
    const angle = (2 * Math.PI * step) / BLADE.aroundSections;
    const fraction = (1 + Math.cos(angle)) / 2;
    const side = Math.sin(angle) >= 0 ? 1 : -1;
    const chordwise = lerp(
      -circle * Math.cos(angle),
      (BLADE.pitchAxisShare - fraction) * chord,
      airfoil,
    );
    const thickness = lerp(
      circle * Math.sin(angle),
      side * halfThickness(fraction, ratio) * chord,
      airfoil,
    );
    const x = thickness * Math.cos(twist) - chordwise * Math.sin(twist);
    const z = thickness * Math.sin(twist) + chordwise * Math.cos(twist);
    return [x, radius, z];
  }).flat();
}

function inBand(share: number): boolean {
  return share >= BLADE.band.from && share < BLADE.band.to;
}

function capCentre(ring: readonly number[]): number[] {
  const count = ring.length / 3;
  return [0, 1, 2].map((axis) => {
    let sum = 0;
    for (let index = axis; index < ring.length; index += 3) sum += ring[index];
    return sum / count;
  });
}

export function bladeGeometry(): BufferGeometry {
  const around = BLADE.aroundSections;
  const shares = Array.from({ length: BLADE.spanSections + 1 }, (_, index) => spanShare(index));
  const rings = shares.map(sectionRing);
  const positions = rings.flat();
  const main: number[] = [];
  const band: number[] = [];
  shares.slice(0, -1).forEach((share, section) => {
    const target = inBand(share) ? band : main;
    for (let step = 0; step < around; step += 1) {
      const a = section * around + step;
      const b = section * around + ((step + 1) % around);
      const c = b + around;
      const d = a + around;
      target.push(a, c, b, a, d, c);
    }
  });
  [0, rings.length - 1].forEach((ringIndex, capIndex) => {
    const base = positions.length / 3;
    const centre = base + around;
    positions.push(...rings[ringIndex], ...capCentre(rings[ringIndex]));
    for (let step = 0; step < around; step += 1) {
      const a = base + step;
      const b = base + ((step + 1) % around);
      main.push(...(capIndex === 0 ? [centre, a, b] : [centre, b, a]));
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex([...main, ...band]);
  geometry.addGroup(0, main.length, 0);
  geometry.addGroup(main.length, band.length, 1);
  geometry.computeVertexNormals();
  return geometry;
}
