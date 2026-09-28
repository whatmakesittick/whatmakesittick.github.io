import { DAY_CYCLE_MIN, MINUTES_PER_HOUR, ambientTemperatureC, minuteOfDay } from './day';
import { cellTemperatureC, modulePowerW } from './power';
import { planeOfArrayIrradiance } from './sun';

export const LAPTOP_CHARGE_WH = 53.8;
export const FRIDGE_KWH_PER_DAY = 1.25;
export const WH_PER_KWH = 1000;

const cumulativeByTilt = new Map<number, Float64Array>();

export function clearDayPowerW(minute: number, tiltDeg: number): number {
  const irradiance = planeOfArrayIrradiance(minute, tiltDeg);
  return modulePowerW(irradiance, cellTemperatureC(ambientTemperatureC(minute), irradiance));
}

function cumulativeEnergy(tiltDeg: number): Float64Array {
  const cached = cumulativeByTilt.get(tiltDeg);
  if (cached) return cached;
  const table = new Float64Array(DAY_CYCLE_MIN + 1);
  let previous = clearDayPowerW(minuteOfDay(0), tiltDeg);
  for (let phase = 1; phase <= DAY_CYCLE_MIN; phase += 1) {
    const power = clearDayPowerW(minuteOfDay(phase), tiltDeg);
    table[phase] = table[phase - 1] + (previous + power) / 2 / MINUTES_PER_HOUR;
    previous = power;
  }
  cumulativeByTilt.set(tiltDeg, table);
  return table;
}

export function dailyEnergyWh(tiltDeg: number): number {
  return cumulativeEnergy(tiltDeg)[DAY_CYCLE_MIN];
}

export function energySoFarWh(phase: number, tiltDeg: number): number {
  const table = cumulativeEnergy(tiltDeg);
  const clamped = Math.min(Math.max(phase, 0), DAY_CYCLE_MIN);
  const whole = Math.floor(clamped);
  if (whole === DAY_CYCLE_MIN) return table[whole];
  const share = clamped - whole;
  return table[whole] + (table[whole + 1] - table[whole]) * share;
}

export function laptopCharges(energyWh: number): number {
  return energyWh / LAPTOP_CHARGE_WH;
}

export function fridgeDays(energyWh: number): number {
  return energyWh / WH_PER_KWH / FRIDGE_KWH_PER_DAY;
}
