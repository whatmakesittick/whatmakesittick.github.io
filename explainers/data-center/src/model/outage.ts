import type { OutageReading } from '../ids';
import { GEN_START_S } from './constants';

export const GRID_RETURN_S = 20;
export const OUTAGE_DRILL_SECONDS = 24;

const RUN_DOWN_S = OUTAGE_DRILL_SECONDS - GRID_RETURN_S;

function inDrill(secondsSince: number): boolean {
  return secondsSince >= 0 && secondsSince < OUTAGE_DRILL_SECONDS;
}

function onGrid(generatorShare: number): OutageReading {
  return { source: 'grid', gridOn: true, generatorShare, batteryShare: 0 };
}

export function outageAt(secondsSince: number): OutageReading {
  if (!inDrill(secondsSince)) return onGrid(0);
  if (secondsSince < GEN_START_S) {
    const generatorShare = secondsSince / GEN_START_S;
    return { source: 'battery', gridOn: false, generatorShare, batteryShare: 1 };
  }
  if (secondsSince < GRID_RETURN_S) {
    return { source: 'generator', gridOn: false, generatorShare: 1, batteryShare: 0 };
  }
  return onGrid(1 - (secondsSince - GRID_RETURN_S) / RUN_DOWN_S);
}
