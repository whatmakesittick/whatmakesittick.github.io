import { formatFixed, formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { PHASE_IDS } from '../ids';
import type { ChamberId, ConductionSite, HeartSound, PhaseId, ValveId, ValveState } from '../ids';
import type { ValveMoment } from '../model';
import { REAL_TIME_SPEED, phaseAt, slowMotionFactor } from '../model';

const REAL_TIME_FORMAT = '×1';
const SLOWER_PREFIX = '1/';
const PERCENT = 100;
const MILLIVOLT_DIGITS = 2;
const LITRE_DIGITS = 1;
const HEART_SOUNDS: ReadonlySet<string> = new Set<HeartSound>(['s1', 's2']);

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
  return formatFixed(value, 0);
}

export function formatMs(milliseconds: number): string {
  return t('units.ms', { value: whole(milliseconds) });
}

export function formatPhase(phase: number): string {
  return formatMs(Math.floor(phase));
}

export function describePhase(phase: number): string {
  return t('timeline.value', { time: formatPhase(phase), phase: t(DURING_KEYS[phaseAt(phase)]) });
}

export function formatSpeed(speed: number): string {
  if (speed === REAL_TIME_SPEED) return REAL_TIME_FORMAT;
  return `${SLOWER_PREFIX}${formatNumber(slowMotionFactor(speed))}`;
}

export function describeSpeed(speed: number): string {
  if (speed === REAL_TIME_SPEED) return t('timeline.realTime');
  return t('timeline.slower', { factor: formatNumber(slowMotionFactor(speed)) });
}

export function formatMmHg(mmHg: number): string {
  return t('units.mmHg', { value: whole(mmHg) });
}

export function formatMl(millilitres: number): string {
  return t('units.ml', { value: whole(millilitres) });
}

export function formatMlPerSecond(millilitresPerSecond: number): string {
  return t('units.mlPerSecond', { value: whole(millilitresPerSecond) });
}

export function formatMillivolts(millivolts: number): string {
  return t('units.mv', { value: formatFixed(millivolts, MILLIVOLT_DIGITS) });
}

export function formatCount(count: number): string {
  return formatNumber(count);
}

export function formatPerMinute(ratePerMinute: number): string {
  return t('units.perMinute', { value: whole(ratePerMinute) });
}

export function formatLitres(litres: number): string {
  return t('units.litres', { value: formatFixed(litres, LITRE_DIGITS) });
}

export function formatSeconds(seconds: number): string {
  return t('units.seconds', { value: whole(seconds) });
}

export function formatPercent(share: number): string {
  return t('units.percent', { value: whole(share * PERCENT) });
}

export function formatEffort(effort: number): string {
  return effort > 0 ? formatPercent(effort) : t('units.resting');
}

export function formatValveState(state: ValveState): string {
  return t(`valves.state.${state}`);
}

export function formatSignal(site: ConductionSite): string {
  return t(`signal.${site}`);
}

export function formatReceives(chamber: ChamberId): string {
  return t(`chambers.receives.${chamber}`);
}

export function formatSends(chamber: ChamberId): string {
  return t(`chambers.sends.${chamber}`);
}

export function formatWall(chamber: ChamberId): string {
  return t(`chambers.wall.${chamber}`);
}

export function formatRole(chamber: ChamberId): string {
  return t(`chambers.role.${chamber}`);
}

export function formatBetween(valve: ValveId): string {
  return t(`valves.between.${valve}`);
}

export function formatValveMoment(moment: ValveMoment): string {
  return HEART_SOUNDS.has(moment) ? t(`valves.sound.${moment}`) : t(`valves.now.${moment}`);
}
