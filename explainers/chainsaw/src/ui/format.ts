import { formatFixed, formatNumber } from '@core/format';
import { currentLanguage, t } from '@core/i18n';
import type { ClutchStateId, EngineStateId, PhaseId, StartDisplayId } from '../ids';
import {
  CHAIN_MM_PER_TURN,
  SPROCKET_TEETH,
  cuttersPerSecond,
  kmh,
  strokesPerSecond,
  turnMs,
} from '../model';
import type { CrankcaseTrend } from '../state';

const TENTHS = 1;
const PERCENT = 100;
const RPM_STEP = 100;
const CUTTERS_STEP = 10;

function unit(key: string, value: string): string {
  return t(`units.${key}`, { value });
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function capitalise(text: string, language: string): string {
  const [first = '', ...rest] = text;
  return first.toLocaleUpperCase(language) + rest.join('');
}

function whole(value: number): string {
  return formatNumber(Math.round(value));
}

export function formatRpm(rpm: number): string {
  return unit('rpm', formatNumber(roundTo(rpm, RPM_STEP)));
}

export function formatSpeedMs(metresPerSecond: number): string {
  return unit('metresPerSecond', formatFixed(metresPerSecond, TENTHS));
}

export function formatSpeedPair(metresPerSecond: number): string {
  return t('units.speedPair', {
    ms: formatFixed(metresPerSecond, TENTHS),
    kmh: whole(kmh(metresPerSecond)),
  });
}

export function formatPercent(fraction: number): string {
  return unit('percent', whole(fraction * PERCENT));
}

export function formatTurnTime(rpm: number): string {
  return unit('milliseconds', formatFixed(turnMs(rpm), TENTHS));
}

export function formatStrokes(rpm: number): string {
  return unit('count', whole(strokesPerSecond(rpm)));
}

export function formatCuttersPerSecond(metresPerSecond: number): string {
  return unit('count', formatNumber(roundTo(cuttersPerSecond(metresPerSecond), CUTTERS_STEP)));
}

export function formatClutch(clutch: ClutchStateId): string {
  return t(`readouts.clutchState.${clutch}`);
}

export function formatPhaseNow(phase: PhaseId): string {
  return capitalise(t(`timeline.detail.${phase}`), currentLanguage());
}

export function formatCrankcase(trend: CrankcaseTrend): string {
  return t(`chapters.fuel.pressure.${trend}`);
}

export function formatPerTurn(): string {
  return t('chapters.clutch.perTurnValue', {
    mm: whole(CHAIN_MM_PER_TURN),
    teeth: formatNumber(SPROCKET_TEETH),
  });
}

export function formatOil(oiling: boolean): string {
  return t(`chapters.clutch.oilState.${oiling ? 'pumping' : 'stopped'}`);
}

export function formatBrake(brake: boolean): string {
  return t(`chapters.kickback.brakeState.${brake ? 'on' : 'off'}`);
}

export function formatEngineState(engine: EngineStateId): string {
  return t(`readouts.engineState.${engine}`);
}

export function formatEngineSpeed(engine: EngineStateId, rpm: number): string {
  return engine === 'running' ? formatRpm(rpm) : formatEngineState(engine);
}

export function formatStartStep(display: StartDisplayId): string {
  return t(`chapters.starting.steps.${display}`);
}
