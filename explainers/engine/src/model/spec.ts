export type EngineType = 'petrol' | 'diesel';
export type IgnitionKind = 'spark' | 'compression';
export type IntakeCharge = 'mixture' | 'air';

export interface ValveTiming {
  intakeOpen: number;
  intakeClose: number;
  exhaustOpen: number;
  exhaustClose: number;
}

export interface IgnitionEvent {
  advance: number;
  duration: number;
}

export interface EngineSpec {
  type: EngineType;
  label: string;
  ignition: IgnitionKind;
  intakeCharge: IntakeCharge;
  bore: number;
  strokeLength: number;
  rodLength: number;
  compressionRatio: number;
  maxValveLift: number;
  valveTiming: ValveTiming;
  ignitionEvent: IgnitionEvent;
  ignitionDelay: number;
  burnDuration: number;
  combustionPressureGain: number;
}

export const COMPRESSION_RATIO_RANGE = { min: 6, max: 24, step: 0.5 } as const;

export const PETROL: EngineSpec = {
  type: 'petrol',
  label: 'Petrol',
  ignition: 'spark',
  intakeCharge: 'mixture',
  bore: 86,
  strokeLength: 86,
  rodLength: 145,
  compressionRatio: 10,
  maxValveLift: 9,
  valveTiming: { intakeOpen: 705, intakeClose: 225, exhaustOpen: 495, exhaustClose: 15 },
  ignitionEvent: { advance: 12, duration: 6 },
  ignitionDelay: 2,
  burnDuration: 45,
  combustionPressureGain: 2.5,
};

export const DIESEL: EngineSpec = {
  type: 'diesel',
  label: 'Diesel',
  ignition: 'compression',
  intakeCharge: 'air',
  bore: 86,
  strokeLength: 86,
  rodLength: 145,
  compressionRatio: 17,
  maxValveLift: 9,
  valveTiming: { intakeOpen: 710, intakeClose: 215, exhaustOpen: 500, exhaustClose: 10 },
  ignitionEvent: { advance: 10, duration: 25 },
  ignitionDelay: 6,
  burnDuration: 70,
  combustionPressureGain: 2,
};

export const ENGINE_SPECS: Record<EngineType, EngineSpec> = { petrol: PETROL, diesel: DIESEL };
export const ENGINE_TYPES: readonly EngineType[] = ['petrol', 'diesel'];

export function withCompressionRatio(spec: EngineSpec, compressionRatio: number): EngineSpec {
  const clamped = Math.min(
    COMPRESSION_RATIO_RANGE.max,
    Math.max(COMPRESSION_RATIO_RANGE.min, compressionRatio),
  );
  return { ...spec, compressionRatio: clamped };
}
