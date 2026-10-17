import type { AssemblyState, GasId, NozzleThrusts, TankReading } from '../ids';
import { NOZZLE_IDS } from '../ids';
import {
  RUN_SECONDS,
  TOUCHDOWN_SPEED_MS,
  emptyAtSeconds,
  massFlow,
  runAt,
  shortfallMs,
  tankAt,
} from '../model';
import type { RunReading } from '../model';
import type { ThrusterCarState } from './store';

export type LiveSource = Pick<ThrusterCarState, 'phase' | 'gas' | 'tankLitres'>;

export type AssemblySource = Pick<
  ThrusterCarState,
  'phase' | 'playing' | 'gas' | 'tankLitres' | 'view'
>;

export interface LiveReading extends RunReading {
  tank: TankReading;
  thrustN: number;
  massFlowKgS: number;
}

export interface RunOutcome {
  ranDry: boolean;
  emptyAtSeconds: number | null;
  touchdownMs: number;
}

const SILENT_NOZZLES: NozzleThrusts = Object.freeze(
  Object.fromEntries(NOZZLE_IDS.map((id) => [id, 0])) as Record<keyof NozzleThrusts, number>,
);

function totalThrust(nozzles: NozzleThrusts): number {
  return NOZZLE_IDS.reduce((sum, id) => sum + nozzles[id], 0);
}

function readingOf({ phase, gas, tankLitres }: LiveSource): LiveReading {
  const run = runAt(phase);
  const tank = tankAt(phase, gas, tankLitres);
  const nozzles = tank.empty ? SILENT_NOZZLES : run.nozzles;
  const thrustN = totalThrust(nozzles);
  return { ...run, nozzles, tank, thrustN, massFlowKgS: massFlow(thrustN, gas) };
}

let lastSource: LiveSource | null = null;
let lastReading: LiveReading | null = null;

export function liveReading(source: LiveSource): LiveReading {
  if (
    lastReading &&
    lastSource &&
    lastSource.phase === source.phase &&
    lastSource.gas === source.gas &&
    lastSource.tankLitres === source.tankLitres
  ) {
    return lastReading;
  }
  lastSource = { phase: source.phase, gas: source.gas, tankLitres: source.tankLitres };
  lastReading = readingOf(source);
  return lastReading;
}

export function runOutcome(gas: GasId, litres: number): RunOutcome {
  const emptyAt = emptyAtSeconds(gas, litres);
  return {
    ranDry: emptyAt !== null,
    emptyAtSeconds: emptyAt,
    touchdownMs: TOUCHDOWN_SPEED_MS + shortfallMs(gas, litres),
  };
}

export function runUsedShare(gas: GasId, litres: number): number {
  return 1 - tankAt(RUN_SECONDS, gas, litres).massShare;
}

export function writeAssemblyState(target: AssemblyState, source: AssemblySource): AssemblyState {
  const reading = liveReading(source);
  target.phase = source.phase;
  target.playing = source.playing;
  target.gas = source.gas;
  target.tankLitres = source.tankLitres;
  Object.assign(target.car, reading.car);
  Object.assign(target.nozzles, reading.nozzles);
  Object.assign(target.tank, reading.tank);
  target.fans = reading.fans;
  Object.assign(target.view, source.view);
  return target;
}

export function createAssemblyState(source: AssemblySource): AssemblyState {
  const reading = liveReading(source);
  const target: AssemblyState = {
    phase: source.phase,
    playing: source.playing,
    gas: source.gas,
    tankLitres: source.tankLitres,
    car: { ...reading.car },
    nozzles: { ...reading.nozzles },
    tank: { ...reading.tank },
    fans: reading.fans,
    view: { ...source.view },
  };
  return writeAssemblyState(target, source);
}
