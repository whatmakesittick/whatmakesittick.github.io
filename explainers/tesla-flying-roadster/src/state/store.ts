import type { ExplainerStore, Playback, PlaybackState } from '@core/explainer';
import { clamp } from '@core/math';
import { createExplainerStore } from '@core/store';
import type { GasId, PresetId, TankChoiceId, ViewOptions } from '../ids';
import {
  DEFAULT_TANK_LITRES,
  ENTRY_SPEED_MS,
  JUMP_HEIGHT_M,
  NEWTONS_PER_KILONEWTON,
  REAR_THRUST_FULL_N,
  ROLL_INERTIA_KG_M2,
  SPEED_RANGE,
  TANK_LITRES,
  TANK_PRESSURE_BAR,
} from '../model';
import { THRUSTER_CAR_TIMELINE } from '../timeline';
import { PRESETS } from './presets';
import type { Preset } from './presets';

export type ViewState = { [Key in keyof ViewOptions]: ViewOptions[Key] };

type NumberOf<Text> = Text extends `${infer Value extends number}` ? Value : never;

export type TankLitres = NumberOf<TankChoiceId>;

export interface CalculatorFields {
  fillShare: number;
  pressureBar: number;
  rearThrustKn: number;
  entrySpeed: number;
  rollInertia: number;
  jumpHeight: number;
}

export interface SteppedRange {
  min: number;
  max: number;
  step: number;
}

export interface ThrusterCarFields extends CalculatorFields {
  gas: GasId;
  tankLitres: TankLitres;
  view: ViewState;
  preset: PresetId;
}

export interface ThrusterCarOwnActions {
  setGas(gas: GasId): void;
  setTankLitres(litres: TankLitres): void;
  setFillShare(share: number): void;
  setPressureBar(bar: number): void;
  setRearThrustKn(kn: number): void;
  setEntrySpeed(ms: number): void;
  setRollInertia(kgm2: number): void;
  setJumpHeight(metres: number): void;
}

export type ThrusterCarState = PlaybackState & ThrusterCarFields;
export type ThrusterCarStoreState = Playback & ThrusterCarFields & ThrusterCarOwnActions;
export type ThrusterCarStore = ExplainerStore<ThrusterCarStoreState>;

const SNAP_DIGITS = 2;

export const DEFAULT_VIEW: ViewState = {
  nozzles: false,
  forces: false,
  tank: false,
  ghost: true,
  labels: true,
};

const DEFAULT_GAS: GasId = 'air';

export const CALCULATOR_RANGES: Readonly<Record<keyof CalculatorFields, SteppedRange>> = {
  fillShare: { min: 0, max: 1, step: 0.05 },
  pressureBar: { min: 100, max: TANK_PRESSURE_BAR, step: 50 },
  rearThrustKn: { min: 10, max: REAR_THRUST_FULL_N / NEWTONS_PER_KILONEWTON, step: 5 },
  entrySpeed: { min: 15, max: 24, step: 0.5 },
  rollInertia: { min: 500, max: 900, step: 50 },
  jumpHeight: { min: 4, max: 12, step: 0.5 },
};

export const CALCULATOR_DEFAULTS: Readonly<CalculatorFields> = {
  fillShare: 1,
  pressureBar: TANK_PRESSURE_BAR,
  rearThrustKn: REAR_THRUST_FULL_N / NEWTONS_PER_KILONEWTON,
  entrySpeed: ENTRY_SPEED_MS,
  rollInertia: ROLL_INERTIA_KG_M2,
  jumpHeight: JUMP_HEIGHT_M,
};

const TANK_CHOICES: ReadonlySet<number> = new Set(Object.values(TANK_LITRES));

const START_PRESET: PresetId = 'tank';
const START = PRESETS[START_PRESET];
const START_SPEED = START.speed ?? SPEED_RANGE.default;
const START_PAUSED = START.pauseAt !== undefined;
export const START_PHASE = START.pauseAt ?? START.startAt ?? 0;
export const START_VIEW: ViewState = { ...DEFAULT_VIEW, ...START.view };

export function snapToRange(value: number, { min, max, step }: SteppedRange): number {
  const steps = Math.round((clamp(value, min, max) - min) / step);
  return Number(clamp(min + steps * step, min, max).toFixed(SNAP_DIGITS));
}

export function isTankChoice(litres: number): litres is TankLitres {
  return TANK_CHOICES.has(litres);
}

export function toTankLitres(litres: number): TankLitres {
  if (!isTankChoice(litres)) throw new Error(`No ${litres} L tank`);
  return litres;
}

function presetFields(preset: Preset, state: ThrusterCarFields): Partial<ThrusterCarFields> {
  if (PRESETS[state.preset] === preset) return {};
  return { ...CALCULATOR_DEFAULTS };
}

export function createThrusterCarStore(
  overrides: Partial<ThrusterCarStoreState> = {},
): ThrusterCarStore {
  return createExplainerStore<ThrusterCarFields & ThrusterCarOwnActions, Preset>(
    {
      timeline: THRUSTER_CAR_TIMELINE,
      presets: PRESETS,
      defaults: { preset: START_PRESET, speed: START_SPEED, view: START_VIEW },
      extend: (set) => {
        const snapped = (field: keyof CalculatorFields) => (value: number) =>
          set({ [field]: snapToRange(value, CALCULATOR_RANGES[field]) });
        return {
          ...CALCULATOR_DEFAULTS,
          gas: DEFAULT_GAS,
          tankLitres: toTankLitres(DEFAULT_TANK_LITRES),
          setGas: (gas) => set({ gas }),
          setTankLitres: (tankLitres) => set({ tankLitres }),
          setFillShare: snapped('fillShare'),
          setPressureBar: snapped('pressureBar'),
          setRearThrustKn: snapped('rearThrustKn'),
          setEntrySpeed: snapped('entrySpeed'),
          setRollInertia: snapped('rollInertia'),
          setJumpHeight: snapped('jumpHeight'),
        };
      },
      presetState: presetFields,
    },
    { phase: START_PHASE, playing: !START_PAUSED, pausedByPreset: START_PAUSED, ...overrides },
  );
}
