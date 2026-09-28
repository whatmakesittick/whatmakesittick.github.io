import type { CellPosition, ModuleLayout } from './module';
import {
  BYPASS_DIODE_DROP_V,
  CELL_BREAKDOWN_V,
  MODULE_SPEC,
  SINGLE_DIODE_CURVE,
  STANDARD_TEST,
  cellCount,
  cellsOf,
  shadedShareOfCell,
} from './module';
import { BAND_GAP_EV } from './optics';
import { KELVIN_OFFSET, thermalVoltageV } from './power';

export const IV_SAMPLES = 120;
export const DEAD_STRING_SHARE = 0.1;
export const IDLE_POWER_SHARE = 0.01;
export const DE_SOTO_BAND_GAP_SLOPE = -0.0002677;

const SWEEP_SAMPLES = 600;
const BACKWARD_REACH = 1;
const FORWARD_REACH = 1.05;
const LAMBERT_ITERATIONS = 40;
const LAMBERT_TOLERANCE = 1e-13;
const LOG_UNDERFLOW = -700;
const DIODE_TOLERANCE_A = 1e-6;
const CUBE = 3;

export type Shading = (cell: CellPosition) => number;
export type Shade = number | Shading;

export interface CellParameters {
  photocurrent: number;
  saturation: number;
  series: number;
  shunt: number;
  diodeVoltage: number;
}

export interface IvPoint {
  voltage: number;
  current: number;
}

export interface OperatingPoint extends IvPoint {
  power: number;
}

interface Polyline {
  xs: Float64Array;
  ys: Float64Array;
}

interface CellGroup {
  cell: CellParameters;
  count: number;
}

interface GroupCircuit {
  strings: readonly Polyline[];
  byCurrent: Polyline;
  bypassCurrent: number;
}

export interface ModuleCircuit {
  layout: ModuleLayout;
  groups: readonly GroupCircuit[];
  sweep: readonly IvPoint[];
}

export interface GroupStates {
  deadStrings: boolean[];
  activeDiodes: boolean[];
}

export interface ShadeAnalysis extends GroupStates {
  curve: IvPoint[];
  clearCurve: IvPoint[];
  maximum: OperatingPoint;
  clearMaximum: OperatingPoint;
}

const NO_POWER: OperatingPoint = { voltage: 0, current: 0, power: 0 };

function lambertWOfExp(logX: number): number {
  if (logX < LOG_UNDERFLOW) return 0;
  let w = logX > 1 ? logX - Math.log(logX) : Math.log1p(Math.exp(logX));
  for (let iteration = 0; iteration < LAMBERT_ITERATIONS; iteration += 1) {
    const step = (w + Math.log(w) - logX) / (1 + 1 / w);
    w -= step;
    if (Math.abs(step) <= LAMBERT_TOLERANCE * w) break;
  }
  return w;
}

export function cellVoltage(current: number, cell: CellParameters): number {
  const { photocurrent, saturation, series, shunt, diodeVoltage } = cell;
  const drive = (photocurrent + saturation - current) * shunt;
  const logX = Math.log((shunt * saturation) / diodeVoltage) + drive / diodeVoltage;
  const junction = drive - diodeVoltage * lambertWOfExp(logX);
  return Math.max(CELL_BREAKDOWN_V, junction - current * series);
}

function moduleSaturationCurrent(cellTemperatureC: number): number {
  const reference = STANDARD_TEST.cellTemperatureC;
  const warmth = (cellTemperatureC + KELVIN_OFFSET) / (reference + KELVIN_OFFSET);
  const gap = BAND_GAP_EV * (1 + DE_SOTO_BAND_GAP_SLOPE * (cellTemperatureC - reference));
  const exponent =
    BAND_GAP_EV / thermalVoltageV(reference) - gap / thermalVoltageV(cellTemperatureC);
  return SINGLE_DIODE_CURVE.saturationCurrentA * warmth ** CUBE * Math.exp(exponent);
}

function moduleLightCurrent(irradiance: number, cellTemperatureC: number): number {
  const drift = MODULE_SPEC.tempCoefficientIsc * MODULE_SPEC.iscA;
  const warm =
    SINGLE_DIODE_CURVE.lightCurrentA + drift * (cellTemperatureC - STANDARD_TEST.cellTemperatureC);
  return (irradiance / STANDARD_TEST.irradiance) * warm;
}

export function cellParameters(
  layout: ModuleLayout,
  irradiance: number,
  cellTemperatureC: number,
): CellParameters {
  const area = MODULE_SPEC.seriesPositions / cellCount(layout);
  const positions = MODULE_SPEC.seriesPositions;
  const shunt = (SINGLE_DIODE_CURVE.shuntOhms * STANDARD_TEST.irradiance) / irradiance;
  return {
    photocurrent: moduleLightCurrent(irradiance, cellTemperatureC) * area,
    saturation: moduleSaturationCurrent(cellTemperatureC) * area,
    series: SINGLE_DIODE_CURVE.seriesOhms / positions / area,
    shunt: shunt / positions / area,
    diodeVoltage: SINGLE_DIODE_CURVE.ideality * thermalVoltageV(cellTemperatureC),
  };
}

export function bandShading(layout: ModuleLayout, shade: number): Shading {
  return (cell) => shadedShareOfCell(layout, cell.column, cell.row, shade);
}

export function shadedAreaShare(layout: ModuleLayout, shade: number): number {
  const shading = bandShading(layout, shade);
  const cells = cellsOf(layout);
  return cells.reduce((sum, cell) => sum + shading(cell), 0) / cells.length;
}

function toShading(layout: ModuleLayout, shade: Shade): Shading {
  return typeof shade === 'number' ? bandShading(layout, shade) : shade;
}

function interpolate(line: Polyline, x: number): number {
  const { xs, ys } = line;
  const last = xs.length - 1;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[last]) return ys[last];
  let low = 0;
  let high = last;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (xs[middle] <= x) low = middle;
    else high = middle;
  }
  const span = xs[high] - xs[low];
  if (span === 0) return ys[low];
  return ys[low] + ((ys[high] - ys[low]) * (x - xs[low])) / span;
}

function evenly(from: number, to: number, samples: number): Float64Array {
  const values = new Float64Array(samples + 1);
  for (let index = 0; index <= samples; index += 1) {
    values[index] = from + ((to - from) * index) / samples;
  }
  return values;
}

function stringCells(
  layout: ModuleLayout,
  string: number,
  shading: Shading,
  template: CellParameters,
): CellGroup[] {
  const counts = new Map<number, number>();
  cellsOf(layout)
    .filter((cell) => cell.string === string)
    .forEach((cell) => {
      const shaded = Math.min(Math.max(shading(cell), 0), 1);
      counts.set(shaded, (counts.get(shaded) ?? 0) + 1);
    });
  return [...counts].map(([shaded, count]) => ({
    cell: { ...template, photocurrent: template.photocurrent * (1 - shaded) },
    count,
  }));
}

function stringVoltage(cells: readonly CellGroup[], current: number): number {
  return cells.reduce((sum, { cell, count }) => sum + count * cellVoltage(current, cell), 0);
}

function stringLine(cells: readonly CellGroup[], currents: Float64Array): Polyline {
  const count = currents.length;
  const xs = new Float64Array(count);
  const ys = new Float64Array(count);
  for (let index = 0; index < count; index += 1) {
    const current = currents[count - 1 - index];
    xs[index] = stringVoltage(cells, current);
    ys[index] = current;
  }
  return { xs, ys };
}

function groupCircuit(strings: readonly Polyline[]): GroupCircuit {
  const top = Math.max(...strings.map((line) => line.xs[line.xs.length - 1]));
  const voltages = evenly(-BYPASS_DIODE_DROP_V, top, SWEEP_SAMPLES);
  const count = voltages.length;
  const xs = new Float64Array(count);
  const ys = new Float64Array(count);
  for (let index = 0; index < count; index += 1) {
    const voltage = voltages[count - 1 - index];
    xs[index] = strings.reduce((sum, line) => sum + interpolate(line, voltage), 0);
    ys[index] = voltage;
  }
  return { strings, byCurrent: { xs, ys }, bypassCurrent: xs[count - 1] };
}

function moduleSweep(groups: readonly GroupCircuit[]): IvPoint[] {
  const top = Math.max(...groups.map((group) => group.bypassCurrent));
  return Array.from(evenly(0, top, SWEEP_SAMPLES), (current) => ({
    current,
    voltage: groups.reduce((sum, group) => sum + interpolate(group.byCurrent, current), 0),
  }));
}

export function moduleCircuit(
  layout: ModuleLayout,
  shade: Shade,
  irradiance: number,
  cellTemperatureC: number,
): ModuleCircuit {
  if (irradiance <= 0) return { layout, groups: [], sweep: [] };
  const shading = toShading(layout, shade);
  const template = cellParameters(layout, irradiance, cellTemperatureC);
  const currents = evenly(
    -BACKWARD_REACH * template.photocurrent,
    FORWARD_REACH * template.photocurrent,
    SWEEP_SAMPLES,
  );
  const groups = Array.from({ length: layout.groups }, (_, group) => {
    const strings = Array.from({ length: layout.stringsPerGroup }, (__, index) => {
      const string = group * layout.stringsPerGroup + index;
      return stringLine(stringCells(layout, string, shading, template), currents);
    });
    return groupCircuit(strings);
  });
  return { layout, groups, sweep: moduleSweep(groups) };
}

export function maximumPowerPoint(points: readonly IvPoint[]): OperatingPoint {
  return points.reduce<OperatingPoint>((best, point) => {
    const power = point.voltage * point.current;
    return power > best.power ? { ...point, power } : best;
  }, NO_POWER);
}

export function ivCurve(circuit: ModuleCircuit, samples = IV_SAMPLES): IvPoint[] {
  const { sweep } = circuit;
  if (sweep.length === 0 || sweep[0].voltage <= 0) return [];
  const byVoltage: Polyline = {
    xs: Float64Array.from(sweep, (point) => point.voltage).reverse(),
    ys: Float64Array.from(sweep, (point) => point.current).reverse(),
  };
  return Array.from(evenly(0, sweep[0].voltage, samples - 1), (voltage) => ({
    voltage,
    current: interpolate(byVoltage, voltage),
  }));
}

function noFlow(layout: ModuleLayout): GroupStates {
  return {
    deadStrings: new Array<boolean>(layout.groups * layout.stringsPerGroup).fill(true),
    activeDiodes: new Array<boolean>(layout.groups).fill(false),
  };
}

function isIdle(maximum: OperatingPoint, clearMaximum: OperatingPoint): boolean {
  return maximum.power <= IDLE_POWER_SHARE * clearMaximum.power;
}

export function groupStates(
  circuit: ModuleCircuit,
  maximum: OperatingPoint,
  clearMaximum: OperatingPoint,
): GroupStates {
  const { layout, groups } = circuit;
  if (groups.length === 0 || isIdle(maximum, clearMaximum)) return noFlow(layout);
  const healthyStringCurrent = clearMaximum.current / layout.stringsPerGroup;
  const deadBelow = DEAD_STRING_SHARE * healthyStringCurrent;
  const activeDiodes = groups.map(
    (group) => maximum.current > group.bypassCurrent + DIODE_TOLERANCE_A,
  );
  const deadStrings = groups.flatMap((group) => {
    const voltage = interpolate(group.byCurrent, maximum.current);
    return group.strings.map((line) => voltage <= 0 || interpolate(line, voltage) < deadBelow);
  });
  return { deadStrings, activeDiodes };
}

export function analyseShade(
  layout: ModuleLayout,
  shade: Shade,
  irradiance: number,
  cellTemperatureC: number,
): ShadeAnalysis {
  const clear = moduleCircuit(layout, 0, irradiance, cellTemperatureC);
  const shaded = moduleCircuit(layout, shade, irradiance, cellTemperatureC);
  const clearMaximum = maximumPowerPoint(clear.sweep);
  const maximum = maximumPowerPoint(shaded.sweep);
  return {
    curve: ivCurve(shaded),
    clearCurve: ivCurve(clear),
    maximum,
    clearMaximum,
    ...groupStates(shaded, maximum, clearMaximum),
  };
}
