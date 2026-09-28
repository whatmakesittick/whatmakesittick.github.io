import type { LayoutId } from '../ids';
import type { ShadeAnalysis } from '../model';
import {
  LAYOUTS,
  ambientTemperatureC,
  analyseShade,
  cellTemperatureC,
  energySoFarWh,
  minuteOfDay,
  modulePowerW,
  planeOfArrayIrradiance,
  stringCount,
} from '../model';
import { memoizeLast } from './memo';
import type { SolarPanelFields } from './store';

type DayState = Pick<SolarPanelFields, 'tilt'> & { phase: number };
type CellState = DayState & Pick<SolarPanelFields, 'temperature'>;
type WiringState = CellState & Pick<SolarPanelFields, 'shade' | 'layout'>;

export interface StringStates {
  deadStrings: readonly boolean[];
  activeDiodes: readonly boolean[];
}

const IRRADIANCE_STEP = 5;
const TEMPERATURE_STEP = 0.5;

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function uniformStates(layout: LayoutId, dead: boolean): StringStates {
  const shape = LAYOUTS[layout];
  return Object.freeze({
    deadStrings: Object.freeze(new Array<boolean>(stringCount(shape)).fill(dead)),
    activeDiodes: Object.freeze(new Array<boolean>(shape.groups).fill(false)),
  });
}

const RUNNING: Record<LayoutId, StringStates> = {
  halfCut: uniformStates('halfCut', false),
  fullCell: uniformStates('fullCell', false),
};

const STOPPED: Record<LayoutId, StringStates> = {
  halfCut: uniformStates('halfCut', true),
  fullCell: uniformStates('fullCell', true),
};

const analysisAt = memoizeLast(
  (layout: LayoutId, shade: number, irradiance: number, temperature: number) =>
    analyseShade(LAYOUTS[layout], shade, irradiance, temperature),
);

export function minuteOf(state: Pick<DayState, 'phase'>): number {
  return minuteOfDay(state.phase);
}

export function irradianceOf(state: DayState): number {
  return planeOfArrayIrradiance(minuteOf(state), state.tilt);
}

export function dayCellTemperatureOf(state: DayState): number {
  return cellTemperatureC(ambientTemperatureC(minuteOf(state)), irradianceOf(state));
}

export function cellTemperatureOf(state: CellState): number {
  return state.temperature ?? dayCellTemperatureOf(state);
}

export function shadeAnalysisOf(state: WiringState): ShadeAnalysis {
  return analysisAt(
    state.layout,
    state.shade,
    roundTo(irradianceOf(state), IRRADIANCE_STEP),
    roundTo(cellTemperatureOf(state), TEMPERATURE_STEP),
  );
}

export function shadeFactorOf(state: WiringState): number {
  if (state.shade <= 0) return 1;
  const { maximum, clearMaximum } = shadeAnalysisOf(state);
  return clearMaximum.power > 0 ? maximum.power / clearMaximum.power : 1;
}

export function clearPowerOf(state: CellState): number {
  return modulePowerW(irradianceOf(state), cellTemperatureOf(state));
}

export function powerOf(state: WiringState): number {
  return clearPowerOf(state) * shadeFactorOf(state);
}

export function energyOf(state: DayState): number {
  return energySoFarWh(state.phase, state.tilt);
}

export function stringStatesOf(state: WiringState): StringStates {
  if (irradianceOf(state) <= 0) return STOPPED[state.layout];
  if (state.shade <= 0) return RUNNING[state.layout];
  return shadeAnalysisOf(state);
}
