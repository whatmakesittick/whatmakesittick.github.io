import { wrapInto } from '@core/math';
import { CYCLE_UNITS, unitsDelta } from '../model/playback';
import { SCROLL_WRAP_M } from '../model/layout';

function wrapScroll(valueM: number): number {
  return wrapInto(valueM, SCROLL_WRAP_M);
}

export function advanceScroll(scrollM: number, deltaUnits: number, strideLengthM: number): number {
  return wrapScroll(scrollM + (deltaUnits / CYCLE_UNITS) * strideLengthM);
}

export class RoadScroll {
  private lastUnits = 0;
  private valueM = 0;

  reset(units: number, scrollM = 0): void {
    this.lastUnits = units;
    this.valueM = wrapScroll(scrollM);
  }

  update(units: number, strideLengthM: number): number {
    this.valueM = advanceScroll(this.valueM, unitsDelta(this.lastUnits, units), strideLengthM);
    this.lastUnits = units;
    return this.valueM;
  }
}
