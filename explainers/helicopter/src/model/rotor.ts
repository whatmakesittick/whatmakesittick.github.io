export const ROTOR = {
  radiusMetres: 5,
  bladeCount: 4,
  tailGearRatio: 5,
} as const;

export const BLADE_PITCH_DEGREES = { flat: 0, full: 12 } as const;
export const CYCLIC_PITCH_DEGREES = 4;
export const FULL_CONING_DEGREES = 4;
export const FORWARD_FLAP_DEGREES = 3;

export const AZIMUTH_CYCLE = 360;
export const HALF_TURN = AZIMUTH_CYCLE / 2;

export const ROTOR_HALVES = ['advancing', 'retreating'] as const;
export type RotorHalf = (typeof ROTOR_HALVES)[number];

const SECONDS_PER_MINUTE = 60;
const RADIANS_PER_DEGREE = Math.PI / 180;

export function normalizeAzimuth(degrees: number): number {
  return ((degrees % AZIMUTH_CYCLE) + AZIMUTH_CYCLE) % AZIMUTH_CYCLE;
}

export function degreesPerSecond(rpm: number): number {
  return (rpm / SECONDS_PER_MINUTE) * AZIMUTH_CYCLE;
}

export function tipSpeed(rpm: number, radiusMetres: number = ROTOR.radiusMetres): number {
  return (2 * Math.PI * radiusMetres * rpm) / SECONDS_PER_MINUTE;
}

export function rotorHalf(azimuth: number): RotorHalf {
  return normalizeAzimuth(azimuth) < HALF_TURN ? 'advancing' : 'retreating';
}

export function bladeAzimuth(rotorAzimuth: number, blade: number): number {
  return normalizeAzimuth(rotorAzimuth + (blade * AZIMUTH_CYCLE) / ROTOR.bladeCount);
}

export function collectivePitch(collective: number): number {
  const { flat, full } = BLADE_PITCH_DEGREES;
  return flat + (full - flat) * collective;
}

export function cyclicPitch(azimuth: number, forward: number): number {
  return -CYCLIC_PITCH_DEGREES * forward * Math.sin(azimuth * RADIANS_PER_DEGREE);
}

export function bladePitch(azimuth: number, collective: number, forward: number): number {
  return collectivePitch(collective) + cyclicPitch(azimuth, forward);
}

export function bladeFlap(azimuth: number, collective: number, forward: number): number {
  const coning = FULL_CONING_DEGREES * collective;
  return coning + FORWARD_FLAP_DEGREES * forward * Math.cos(azimuth * RADIANS_PER_DEGREE);
}

export function tailRotorAngle(rotorAzimuth: number): number {
  return normalizeAzimuth(rotorAzimuth * ROTOR.tailGearRatio);
}
