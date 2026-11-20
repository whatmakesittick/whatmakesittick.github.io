import type {
  AssemblyState,
  CutawayId,
  DetailId,
  EngineReading,
  StreamId,
  ViewOptions,
} from '../ids';
import { cutawayTarget, reverserTarget } from './cutaway';
import { flameRing, heatAlong, heatLevel } from './heat';
import {
  coreTurnsPerSecond,
  fanBladeOpacity,
  fanBlurOpacity,
  fanTurnsPerSecond,
  spoolSpeeds,
} from './spools';
import { axialAt, metresAt, phaseIdAt, phaseProgress } from './stations';
import { coldDirection, streamSpeeds } from './streams';
import { thrustShare } from './thrust';

export interface EngineInputs {
  phase: number;
  playing: boolean;
  thrust: number;
  cutaway: CutawayId;
  streams: StreamId;
  view: ViewOptions;
  detail: DetailId;
}

export function engineReading(inputs: EngineInputs): EngineReading {
  const deploy = reverserTarget(inputs.view.reverser);
  return {
    units: inputs.phase,
    phase: phaseIdAt(inputs.phase),
    phaseProgress: phaseProgress(inputs.phase),
    axialFraction: axialAt(inputs.phase),
    axialMetres: metresAt(inputs.phase),
    thrustShare: thrustShare(inputs.thrust, deploy),
    heatAtMarker: heatAlong(inputs.phase, inputs.thrust),
  };
}

export function assemblyState(inputs: EngineInputs): AssemblyState {
  const deploy = reverserTarget(inputs.view.reverser);
  const spools = spoolSpeeds(inputs.thrust, deploy);
  const speeds = streamSpeeds(inputs.thrust, deploy);
  return {
    phase: inputs.phase,
    playing: inputs.playing,
    fanSpeed: spools.fan,
    coreSpeed: spools.core,
    fanTurnsPerSecond: fanTurnsPerSecond(spools.fan),
    coreTurnsPerSecond: coreTurnsPerSecond(spools.core),
    heat: heatLevel(inputs.thrust),
    flame: flameRing(inputs.thrust),
    fanBlur: fanBlurOpacity(spools.fan),
    bladeOpacity: fanBladeOpacity(spools.fan),
    detail: inputs.detail,
    coldSpeed: speeds.cold,
    hotSpeed: speeds.hot,
    coldDirection: coldDirection(deploy),
    streams: inputs.streams,
    cutaway: cutawayTarget(inputs.cutaway),
    reverser: deploy,
    thrust: inputs.thrust,
    view: inputs.view,
    reading: engineReading(inputs),
  };
}
