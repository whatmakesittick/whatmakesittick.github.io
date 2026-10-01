import { formatFixed, formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { PHASE_IDS } from '../ids';
import type { ComparisonId, GasPortId, PhaseId } from '../ids';
import {
  AIR_PRESSURE_MPA,
  CYCLE_DISTANCES,
  REAL_PACE_SPEED,
  loopSeconds,
  msAt,
  phaseIdAt,
  slowdown,
} from '../model';
import type { CaseStage, HammerStage, LockStage, RoundStage } from '../model';

const WHOLE = 0;
const TENTHS = 1;
const PERCENT = 100;
const DECIMAL_LIMIT = 10;
const SIGNIFICANT_DIGITS = 2;

function phaseKeys(group: string): Readonly<Record<PhaseId, string>> {
  return Object.fromEntries(PHASE_IDS.map((id) => [id, `timeline.${group}.${id}`])) as Record<
    PhaseId,
    string
  >;
}

export const PHASE_KEYS = phaseKeys('phase');
export const JUMP_KEYS = phaseKeys('jump');
const DURING_KEYS = phaseKeys('during');

function whole(value: number): string {
  return formatFixed(value, WHOLE);
}

function tenthsBelowTen(value: number): string {
  return formatFixed(value, Math.abs(value) < DECIMAL_LIMIT ? TENTHS : WHOLE);
}

function twoSignificant(value: number): string {
  if (value === 0) return whole(value);
  const magnitude = 10 ** (Math.floor(Math.log10(Math.abs(value))) - SIGNIFICANT_DIGITS + 1);
  const rounded = Math.round(value / magnitude) * magnitude;
  return formatFixed(rounded, Math.max(0, -Math.round(Math.log10(magnitude))));
}

export function formatMs(ms: number): string {
  return t('units.ms', { value: tenthsBelowTen(ms) });
}

export function formatPhase(units: number): string {
  return t('timeline.ms', { value: tenthsBelowTen(msAt(units)) });
}

export function describePhase(units: number): string {
  return t('timeline.value', { time: formatPhase(units), phase: t(DURING_KEYS[phaseIdAt(units)]) });
}

function secondsPerShot(speed: number): string {
  return formatFixed(loopSeconds(speed), TENTHS);
}

export function formatSpeed(speed: number): string {
  return t('timeline.perShot', { seconds: secondsPerShot(speed) });
}

export function describeSpeed(speed: number): string {
  if (speed === REAL_PACE_SPEED) return t('timeline.realPace');
  return t('timeline.speedValue', { factor: formatNumber(slowdown(speed)) });
}

export function formatPressure(mpa: number): string {
  return t('units.mpa', { value: whole(mpa) });
}

export function formatTimesAir(mpa: number): string {
  return t('units.timesAir', { value: twoSignificant(mpa / AIR_PRESSURE_MPA) });
}

export function formatSpeedMs(metresPerSecond: number): string {
  return t('units.metresPerSecond', { value: whole(metresPerSecond) });
}

export function formatPercent(share: number): string {
  return t('units.percent', { value: whole(share * PERCENT) });
}

export function formatPerMinute(count: number): string {
  return t('units.perMinute', { value: whole(count) });
}

export function formatMm(mm: number): string {
  return t('units.mm', { value: whole(mm) });
}

export function formatSpin(turnsPerSecond: number): string {
  return t('units.turnsPerSecond', { value: twoSignificant(turnsPerSecond) });
}

export function formatTurns(turns: number): string {
  return t('units.turns', { value: formatFixed(turns, TENTHS) });
}

export function formatHammer(stage: HammerStage): string {
  return t(`firing.hammer.${stage}`);
}

export function formatLock(stage: LockStage): string {
  return t(`firing.lock.${stage}`);
}

export function formatGasResult(gasPort: GasPortId): string {
  return t(`gas.result.${gasPort}`);
}

export function formatCase(stage: CaseStage): string {
  return t(`reload.case.${stage}`);
}

export function formatRound(stage: RoundStage): string {
  return t(`reload.round.${stage}`);
}

export function formatComparison(comparison: ComparisonId): string {
  if (comparison === 'blink') return t('reload.compare.blink');
  return t(`reload.compare.${comparison}`, {
    metres: tenthsBelowTen(CYCLE_DISTANCES[comparison]),
  });
}
