import type { CoolantReading, CoolingId, LoadId } from '../ids';
import {
  AIR_INLET_C,
  AIR_M3H_PER_KW,
  AIR_RISE_K,
  RACK_FLOW_KG_S,
  RACK_KW,
  SUPPLY_C,
  WATER_CP_KJ,
} from './constants';
import { fanShareAt } from './fans';
import { rackPowerKw } from './power';

export { fanShareAt } from './fans';

const PUMP_FLOW_SHARE = 1;

export function airflowFor(rackKw: number): number {
  return rackKw * AIR_M3H_PER_KW;
}

function waterReading(rackKw: number): CoolantReading {
  return {
    medium: 'water',
    supplyC: SUPPLY_C,
    returnC: SUPPLY_C + rackKw / (RACK_FLOW_KG_S * WATER_CP_KJ),
    flowShare: PUMP_FLOW_SHARE,
  };
}

function airReading(rackKw: number, fanShare: number): CoolantReading {
  const fanAirflow = airflowFor(RACK_KW.air) * fanShare;
  return {
    medium: 'air',
    supplyC: AIR_INLET_C,
    returnC: AIR_INLET_C + (AIR_RISE_K * airflowFor(rackKw)) / fanAirflow,
    flowShare: fanShare,
  };
}

export function coolantAt(cooling: CoolingId, load: LoadId): CoolantReading {
  const rackKw = rackPowerKw(cooling, load);
  return cooling === 'liquid'
    ? waterReading(rackKw)
    : airReading(rackKw, fanShareAt(cooling, load));
}
