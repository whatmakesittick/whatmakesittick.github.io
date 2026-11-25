import type { ArmsId, ForceReading, GaitReading, LegReading, PaceId, SideId } from '../ids';
import { comAt } from './com';
import { legForceAt } from './forces';
import { GAIT_DATA } from './gaitData';
import { landingReachM } from './footPath';
import { legAnglesAt } from './legAngles';
import { timingAt } from './paces';
import { HALF_CYCLE_UNITS, phaseAt, wrapUnits } from './timeMap';
import { upperAt } from './upper';

export { comAt } from './com';
export { landingReachM } from './footPath';
export { upperAt } from './upper';

export interface GaitOptions {
  pace: PaceId;
  stepRate: number;
  arms: ArmsId;
}

function legAt(unitsOfLeg: number, options: GaitOptions, strideLengthM: number): LegReading {
  const { pace, stepRate } = options;
  const { toeOffUnits } = GAIT_DATA[pace];
  const contact = unitsOfLeg < toeOffUnits;
  return {
    ...legAnglesAt(unitsOfLeg, pace, stepRate),
    phase: phaseAt(unitsOfLeg, pace),
    contact,
    stanceShare: contact ? unitsOfLeg / toeOffUnits : null,
    roadTravelM: contact ? (strideLengthM * unitsOfLeg) / 1000 : null,
    force: legForceAt(unitsOfLeg, pace, stepRate),
  };
}

function floatAt(units: number, toeOffUnits: number): 0 | 1 | 2 {
  if (units >= toeOffUnits && units < HALF_CYCLE_UNITS) return 1;
  if (units >= HALF_CYCLE_UNITS + toeOffUnits) return 2;
  return 0;
}

export function gaitAt(units: number, options: GaitOptions): GaitReading {
  const { pace, stepRate, arms } = options;
  const wrapped = wrapUnits(units);
  const timing = timingAt(pace, stepRate);
  const right = legAt(wrapped, options, timing.strideLengthM);
  const left = legAt(wrapUnits(wrapped + HALF_CYCLE_UNITS), options, timing.strideLengthM);
  const onFoot: SideId | null = right.contact ? 'right' : left.contact ? 'left' : null;
  const force: ForceReading = {
    fwdBW: right.force.fwdBW + left.force.fwdBW,
    vertBW: right.force.vertBW + left.force.vertBW,
    rightBW: right.force.rightBW + left.force.rightBW,
    onFoot,
  };
  return {
    units: wrapped,
    pace,
    stepRate,
    arms,
    right,
    left,
    float: floatAt(wrapped, GAIT_DATA[pace].toeOffUnits),
    timing,
    force,
    com: comAt(wrapped, pace, stepRate),
    landing: { reachM: landingReachM(pace, stepRate) },
    upper: upperAt(wrapped, pace, arms),
  };
}
