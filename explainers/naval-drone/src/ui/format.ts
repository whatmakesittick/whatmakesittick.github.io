import { formatFixed, formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { toDegrees } from '@core/math';
import { PHASE_IDS } from '../ids';
import type { FitId, HelmId, HullMode, LinkMode, PhaseId, SeaStateId } from '../ids';
import {
  BOAT,
  BOAT_COST_USD,
  DETECTION_KM,
  HULL_SPEED_KN,
  KOTOV_VALUE_MUSD,
  LENS_HEIGHT_M,
  NEWTONS_PER_KILONEWTON,
  PAYLOAD_MAX_KG,
  SEAWATER_DENSITY,
  SEA_STATES,
  boatLengths,
  detectionCovered,
  knotsToKmh,
  lagMetres,
  minutesAtTopSpeed,
  msToKmh,
  phaseAt,
  visualHorizonKm,
} from '../model';

const WHOLE = 0;
const TENTHS = 1;
const HUNDREDTHS = 2;
const PERCENT = 100;
const SECONDS_PER_MINUTE = 60;
const CLOCK_DIGITS = 2;
const CLOCK_PAD = '0';
const CLOCK_SEPARATOR = ':';
const WHOLE_KNOTS_FROM = 10;
const METRES_STEP = 10;
const METRES_PER_KM = 1000;
const KG_PER_LITRE = SEAWATER_DENSITY / METRES_PER_KM;
const STRAIGHT_NOZZLE = 0.5;

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

function tenths(value: number): string {
  return formatFixed(value, TENTHS);
}

function percentOf(share: number): number {
  return Math.round(share * PERCENT);
}

export function clockText(seconds: number): string {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / SECONDS_PER_MINUTE);
  const rest = total % SECONDS_PER_MINUTE;
  return [String(minutes), String(rest).padStart(CLOCK_DIGITS, CLOCK_PAD)].join(CLOCK_SEPARATOR);
}

export function formatPhase(seconds: number): string {
  return t('timeline.clock', { clock: clockText(seconds) });
}

export function describePhase(seconds: number): string {
  return t('timeline.value', {
    time: formatPhase(seconds),
    phase: t(DURING_KEYS[phaseAt(seconds)]),
  });
}

export function formatSpeed(speed: number): string {
  return t('timeline.speedFormat', { factor: formatNumber(speed) });
}

export function describeSpeed(): string {
  return t('timeline.speedValue');
}

function knotsText(knots: number): string {
  return knots < WHOLE_KNOTS_FROM ? tenths(knots) : whole(knots);
}

export function formatBoatSpeed(knots: number): string {
  return t('units.speed', { kn: knotsText(knots), kmh: whole(knotsToKmh(knots)) });
}

export function formatTrialSpeed(knots: number): string {
  return t('units.speed', { kn: tenths(knots), kmh: whole(knotsToKmh(knots)) });
}

export function formatMode(mode: HullMode): string {
  return t(`mode.${mode}`);
}

export function formatDistance(metres: number): string {
  const rounded = Math.round(metres / METRES_STEP) * METRES_STEP;
  if (rounded < METRES_PER_KM) return t('units.m', { value: whole(rounded) });
  return t('units.km', { value: tenths(metres / METRES_PER_KM) });
}

export function formatPercent(share: number): string {
  return t('units.percent', { value: whole(percentOf(share)) });
}

export function formatDegrees(radians: number): string {
  return t('units.degrees', { value: tenths(toDegrees(radians)) });
}

export function formatLift(liftShare: number): string {
  const dynamic = percentOf(liftShare);
  return t('hull.lift', { dynamic: whole(dynamic), buoyant: whole(PERCENT - dynamic) });
}

export function formatWetted(metres: number): string {
  return t('hull.wetted', { m: tenths(metres), rest: tenths(BOAT.waterlineLength) });
}

export function formatHullRatio(knots: number): string {
  const hullSpeed = tenths(HULL_SPEED_KN);
  if (knots <= 0) return t('hull.ratioStill', { hullSpeed });
  return t('hull.ratio', { times: tenths(knots / HULL_SPEED_KN), hullSpeed });
}

export function formatBoatOrBacking(knots: number, helm: HelmId): string {
  return helm === 'reverse' ? t('jet.backing') : formatBoatSpeed(knots);
}

export function formatFlow(kgPerSecond: number): string {
  return t('jet.flow', { kg: whole(kgPerSecond), litres: whole(kgPerSecond / KG_PER_LITRE) });
}

export function formatJetSpeed(metresPerSecond: number): string {
  return t('units.mps', { ms: whole(metresPerSecond), kmh: whole(msToKmh(metresPerSecond)) });
}

export function formatThrust(newtons: number, helm: HelmId): string {
  if (helm === 'reverse') return t('jet.astern');
  return t('units.kilonewtons', {
    value: formatFixed(newtons / NEWTONS_PER_KILONEWTON, HUNDREDTHS),
  });
}

export function formatEfficiency(efficiency: number, knots: number): string {
  return knots <= 0 ? t('jet.noEfficiency') : formatPercent(efficiency);
}

export function formatPush(helm: HelmId, nozzleAngle: number): string {
  if (helm === 'reverse') return t('jet.push.reverse');
  const degrees = toDegrees(nozzleAngle);
  if (Math.abs(degrees) < STRAIGHT_NOZZLE) return t('jet.push.straight');
  const side = degrees < 0 ? 'left' : 'right';
  return t(`jet.push.${side}`, { angle: whole(Math.abs(degrees)) });
}

export function formatDelay(delayMs: number): string {
  return t('units.ms', { value: whole(delayMs) });
}

export function formatLinkNow(mode: LinkMode, delayMs: number, knots: number): string {
  if (mode === 'lost') return t('link.nowLost');
  return t('link.now', { m: tenths(lagMetres(delayMs, knots)), kn: knotsText(knots) });
}

export function formatLinkTop(delayMs: number): string {
  const metres = lagMetres(delayMs, BOAT.topKnots);
  return t('link.top', { m: tenths(metres), lengths: tenths(boatLengths(metres)) });
}

export function formatLinkCarrier(mode: LinkMode): string {
  return t(`link.carrier.${mode}`);
}

export function formatLinkBoat(mode: LinkMode): string {
  return t(`link.boat.${mode}`);
}

export function formatMetres(metres: number): string {
  return t('units.m', { value: whole(metres) });
}

export function formatKm(km: number): string {
  return t('units.km', { value: tenths(km) });
}

export function formatMinutes(minutes: number): string {
  return t('units.minutes', { value: tenths(minutes) });
}

export function formatCameraHorizon(): string {
  return t('horizon.camera', {
    km: tenths(visualHorizonKm(LENS_HEIGHT_M)),
    m: tenths(LENS_HEIGHT_M),
  });
}

export function formatDetection(sea: SeaStateId): string {
  if (!detectionCovered(sea)) return t('horizon.detectBeyond');
  return t('horizon.detect', {
    km: tenths(DETECTION_KM),
    min: tenths(minutesAtTopSpeed(DETECTION_KM)),
  });
}

export function formatWaves(sea: SeaStateId): string {
  const { from, to } = SEA_STATES[sea];
  return t(`horizon.waves.${sea}`, { from: formatNumber(from), to: formatNumber(to) });
}

export function formatHidden(sea: SeaStateId): string {
  return t(`horizon.hidden.${sea}`);
}

export function formatCanvasKm(km: number): string {
  return t('horizon.canvas.km', { value: whole(km) });
}

export function formatCarries(fit: FitId): string {
  if (fit === 'missile') return t('fleet.carries.missile');
  return t('fleet.carries.standard', { kg: whole(PAYLOAD_MAX_KG) });
}

export function formatCost(): string {
  const [from, to] = BOAT_COST_USD;
  return t('fleet.cost', { from: whole(from), to: whole(to) });
}

export function formatShipValue(): string {
  return t('fleet.ship', { value: whole(KOTOV_VALUE_MUSD) });
}
