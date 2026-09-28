import {
  MODULE_SPEC,
  NOCT_TEST,
  SINGLE_DIODE_TEACHING,
  STANDARD_TEST,
  THERMAL_VOLTAGE_25C_V,
} from './module';

export const INVERTER_EFFICIENCY = 0.96;
export const KELVIN_OFFSET = 273.15;

export function cellTemperatureC(ambientC: number, irradiance: number): number {
  const risePerIrradiance = (MODULE_SPEC.roofNoctC - NOCT_TEST.ambientC) / NOCT_TEST.irradiance;
  return ambientC + risePerIrradiance * Math.max(0, irradiance);
}

export function temperatureFactor(cellTemperatureC: number): number {
  return 1 + MODULE_SPEC.tempCoefficientPower * (cellTemperatureC - STANDARD_TEST.cellTemperatureC);
}

export function modulePowerW(irradiance: number, cellTemperatureC: number): number {
  if (irradiance <= 0) return 0;
  const light = irradiance / STANDARD_TEST.irradiance;
  return MODULE_SPEC.powerW * light * temperatureFactor(cellTemperatureC);
}

export function thermalVoltageV(cellTemperatureC: number): number {
  const reference = STANDARD_TEST.cellTemperatureC + KELVIN_OFFSET;
  return (THERMAL_VOLTAGE_25C_V * (cellTemperatureC + KELVIN_OFFSET)) / reference;
}

export function vocAt(irradiance: number, cellTemperatureC: number): number {
  if (irradiance <= 0) return 0;
  const warmth =
    1 + MODULE_SPEC.tempCoefficientVoc * (cellTemperatureC - STANDARD_TEST.cellTemperatureC);
  const diodeVoltage =
    MODULE_SPEC.seriesPositions *
    SINGLE_DIODE_TEACHING.ideality *
    thermalVoltageV(cellTemperatureC);
  const light = Math.log(irradiance / STANDARD_TEST.irradiance);
  return Math.max(0, MODULE_SPEC.vocV * warmth + diodeVoltage * light);
}

export function acPowerW(dcPowerW: number): number {
  return Math.max(0, dcPowerW) * INVERTER_EFFICIENCY;
}
