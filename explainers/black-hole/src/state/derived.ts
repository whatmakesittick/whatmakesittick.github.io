import type { PlaybackState } from '@core/explainer';
import type { FlashTone, PhaseId } from '../ids';
import {
  SGR_A_MASS_KG,
  clockRatio,
  dimming,
  etaAtTau,
  flashGap,
  flashTone,
  localSpeed,
  phaseIdAt,
  radiusAtEta,
  shipClock,
  tidalStretchG,
  timeLeft,
} from '../model';

type TimeState = Pick<PlaybackState, 'phase'>;

export interface Fall {
  tau: number;
  radius: number;
  eta: number;
  speed: number;
  phase: PhaseId;
  timeLeft: number;
}

export interface Clocks {
  probeClock: number;
  shipClock: number;
  ratio: number;
  flashGap: number;
  dimming: number;
  flashTone: FlashTone;
  tide: number;
}

function rememberLast<T>(compute: (phase: number) => T): (phase: number) => T {
  let last: { phase: number; value: T } | null = null;
  return (phase) => {
    if (last?.phase !== phase) last = { phase, value: compute(phase) };
    return last.value;
  };
}

function fallAt(tau: number): Fall {
  const eta = etaAtTau(tau);
  const radius = radiusAtEta(eta);
  return {
    tau,
    radius,
    eta,
    speed: localSpeed(radius),
    phase: phaseIdAt(tau),
    timeLeft: timeLeft(tau),
  };
}

const latestFall = rememberLast(fallAt);

export function fallOf(state: TimeState): Readonly<Fall> {
  return latestFall(state.phase);
}

function clocksAt(tau: number): Clocks {
  const { radius } = latestFall(tau);
  return {
    probeClock: tau,
    shipClock: shipClock(tau),
    ratio: clockRatio(tau),
    flashGap: flashGap(tau),
    dimming: dimming(tau),
    flashTone: flashTone(tau),
    tide: tidalStretchG(radius, SGR_A_MASS_KG),
  };
}

const latestClocks = rememberLast(clocksAt);

export function clocksOf(state: TimeState): Readonly<Clocks> {
  return latestClocks(state.phase);
}
