import type { AssemblyState, FarmSite, PresetId, SceneId, SpacingD } from '../ids';
import { PRESET_SCENES, SPACING_OPTIONS } from '../ids';
import {
  FARM_RATED_KW,
  RATED_KW,
  axialInduction,
  dayWind,
  farmLayout,
  farmPowerKw,
  initialDeficit,
  operatingAt,
  operatingAtWind,
  plumeLengthD,
  thrustCoefficient,
  turbinePowerKw,
  wakeDeficits,
  windFromDeg,
} from '../model';
import type { OperatingReading } from '../model';
import type { WindFarmState } from './store';

export type LiveSource = Pick<WindFarmState, 'phase' | 'siteWind' | 'windOverride' | 'spacing'>;

export type AssemblySource = LiveSource & Pick<WindFarmState, 'playing' | 'preset' | 'view'>;

export interface LiveReading {
  wind: number;
  fromDeg: number;
  operating: OperatingReading;
  thrust: number;
  heroKw: number;
  farmKw: number;
  deficits: readonly number[];
}

const FARM_SITES = new Map<SpacingD, readonly FarmSite[]>(
  SPACING_OPTIONS.map((spacing) => [spacing, farmLayout(spacing)]),
);

export function farmSitesOf(spacing: SpacingD): readonly FarmSite[] {
  return FARM_SITES.get(spacing) ?? farmLayout(spacing);
}

export function sceneOf(preset: PresetId): SceneId {
  return PRESET_SCENES[preset];
}

export function liveWind({ phase, siteWind, windOverride }: LiveSource): number {
  return windOverride ?? dayWind(phase, siteWind);
}

function operatingOf(source: LiveSource, wind: number): OperatingReading {
  return source.windOverride === null
    ? operatingAt(source.phase, source.siteWind)
    : operatingAtWind(wind);
}

function readingOf(source: LiveSource): LiveReading {
  const wind = liveWind(source);
  const fromDeg = windFromDeg(source.phase);
  const operating = operatingOf(source, wind);
  const thrust = operating.producing ? thrustCoefficient(wind) : 0;
  return {
    wind,
    fromDeg,
    operating,
    thrust,
    heroKw: operating.producing ? turbinePowerKw(wind) : 0,
    farmKw: operating.producing ? farmPowerKw(wind, fromDeg, source.spacing) : 0,
    deficits: wakeDeficits(farmSitesOf(source.spacing), thrust, fromDeg),
  };
}

let lastSource: LiveSource | null = null;
let lastReading: LiveReading | null = null;

function sameSource(a: LiveSource, b: LiveSource): boolean {
  return (
    a.phase === b.phase &&
    a.siteWind === b.siteWind &&
    a.windOverride === b.windOverride &&
    a.spacing === b.spacing
  );
}

export function liveReading(source: LiveSource): LiveReading {
  if (lastReading && lastSource && sameSource(lastSource, source)) return lastReading;
  const { phase, siteWind, windOverride, spacing } = source;
  lastSource = { phase, siteWind, windOverride, spacing };
  lastReading = readingOf(source);
  return lastReading;
}

export function writeAssemblyState(target: AssemblyState, source: AssemblySource): AssemblyState {
  const reading = liveReading(source);
  const { operating } = reading;
  target.scene = sceneOf(source.preset);
  target.phase = source.phase;
  target.playing = source.playing;
  target.wind.speed = reading.wind;
  target.wind.fromDeg = reading.fromDeg;
  target.wind.induction = axialInduction(reading.thrust);
  target.rotor.rpm = operating.rpm;
  target.rotor.pitchDeg = operating.pitchDeg;
  target.rotor.yawDeg = reading.fromDeg;
  target.rotor.state = operating.state;
  target.rotor.braked = operating.braked;
  target.rotor.powerShare = reading.heroKw / RATED_KW;
  target.farm.spacing = source.spacing;
  target.farm.sites = farmSitesOf(source.spacing);
  target.farm.deficits = reading.deficits;
  target.farm.plumeLengthD = plumeLengthD(reading.thrust);
  target.farm.plumeStrength = initialDeficit(reading.thrust);
  target.farm.outputShare = reading.farmKw / FARM_RATED_KW;
  Object.assign(target.view, source.view);
  return target;
}

export function createAssemblyState(source: AssemblySource): AssemblyState {
  const target: AssemblyState = {
    scene: sceneOf(source.preset),
    phase: source.phase,
    playing: source.playing,
    wind: { speed: 0, fromDeg: 0, induction: 0 },
    rotor: { rpm: 0, pitchDeg: 0, yawDeg: 0, state: 'idle', braked: false, powerShare: 0 },
    farm: {
      spacing: source.spacing,
      sites: farmSitesOf(source.spacing),
      deficits: [],
      plumeLengthD: 0,
      plumeStrength: 0,
      outputShare: 0,
    },
    view: { ...source.view },
  };
  return writeAssemblyState(target, source);
}
