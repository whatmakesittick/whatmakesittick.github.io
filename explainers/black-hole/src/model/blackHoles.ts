import type { BlackHoleId } from '../ids';
import {
  LIGHT_SPEED,
  RELEASE_RADIUS,
  SGR_A_MASS_SOLAR,
  SOLAR_MASS_KG,
  schwarzschildRadiusM,
} from './constants';
import { tidalStretchG } from './tides';

export interface BlackHole {
  massSolar: number;
  rsKm: number;
  fallSecondsFrom5Rs: number;
  horizonTideG: number;
}

const M87_MASS_SOLAR = 6.5e9;
const CYGNUS_X1_MASS_SOLAR = 21;
const METRES_PER_KM = 1000;
const HORIZON = 1;

function fallSeconds(massKg: number): number {
  return (Math.PI / 2) * (schwarzschildRadiusM(massKg) / LIGHT_SPEED) * RELEASE_RADIUS ** 1.5;
}

function blackHole(massSolar: number): BlackHole {
  const massKg = massSolar * SOLAR_MASS_KG;
  return {
    massSolar,
    rsKm: schwarzschildRadiusM(massKg) / METRES_PER_KM,
    fallSecondsFrom5Rs: fallSeconds(massKg),
    horizonTideG: tidalStretchG(HORIZON, massKg),
  };
}

export const BLACK_HOLES: Readonly<Record<BlackHoleId, BlackHole>> = {
  sgrA: blackHole(SGR_A_MASS_SOLAR),
  m87: blackHole(M87_MASS_SOLAR),
  stellar: blackHole(CYGNUS_X1_MASS_SOLAR),
};
