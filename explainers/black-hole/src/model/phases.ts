import type { MomentId, PhaseId } from '../ids';
import { PHASE_IDS } from '../ids';
import { LAST_STABLE_ORBIT_RADIUS, PHOTON_SPHERE_RADIUS } from './constants';
import { CENTRE_TIME, HORIZON_TIME, tauAtRadius } from './fall';

const PLUNGE_RADIUS = 4;
const HORIZON_MOMENT_LEAD_S = 3;

export const PHASE_STARTS: Readonly<Record<PhaseId, number>> = {
  letGo: 0,
  plunge: tauAtRadius(PLUNGE_RADIUS),
  noOrbit: tauAtRadius(LAST_STABLE_ORBIT_RADIUS),
  lightRing: tauAtRadius(PHOTON_SPHERE_RADIUS),
  inside: HORIZON_TIME,
};

export interface PhaseRange {
  start: number;
  end: number;
}

export const PHASE_RANGES: Readonly<Record<PhaseId, PhaseRange>> = Object.fromEntries(
  PHASE_IDS.map((id, index) => {
    const next = PHASE_IDS[index + 1];
    return [id, { start: PHASE_STARTS[id], end: next ? PHASE_STARTS[next] : CENTRE_TIME }];
  }),
) as Record<PhaseId, PhaseRange>;

export function phaseIdAt(tau: number): PhaseId {
  const found = [...PHASE_IDS].reverse().find((id) => tau >= PHASE_STARTS[id]);
  return found ?? PHASE_IDS[0];
}

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  lastOrbit: tauAtRadius(LAST_STABLE_ORBIT_RADIUS),
  lightRing: tauAtRadius(PHOTON_SPHERE_RADIUS),
  horizon: HORIZON_TIME - HORIZON_MOMENT_LEAD_S,
};
