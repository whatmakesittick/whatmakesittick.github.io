import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import { CHAPTER_CONTROL_DEFAULTS, DEFAULT_LOAD, DEFAULT_VIEW, PRESETS, missionAt } from '../state';
import type { Preset, ReaperState, ReaperStore, ReaperStoreState } from '../state';
import type { ReaperController } from './controller';
import { DrawnLabels } from './drawnLabels';

export interface SceneTargets extends PresetTargets {
  reaper: ReaperController;
  labelVisibility: LabelPolicy;
}

type AssemblySource = Pick<ReaperState, 'phase' | 'sensorMode' | 'load' | 'playing' | 'view'>;

const BLANK_SOURCE: AssemblySource = {
  phase: 0,
  sensorMode: CHAPTER_CONTROL_DEFAULTS.sensorMode,
  load: DEFAULT_LOAD,
  playing: false,
  view: DEFAULT_VIEW,
};

function copyInto(target: AssemblyState, source: AssemblySource): AssemblyState {
  const { clock, flight, strike, sensor, link } = missionAt(source);
  target.phase = source.phase;
  target.clock = clock;
  target.flight = flight;
  target.strike = strike;
  target.sensor = sensor;
  target.link = link;
  target.load = source.load;
  target.playing = source.playing;
  target.view = source.view;
  return target;
}

function blankState(): AssemblyState {
  const { phase, load, playing, view } = BLANK_SOURCE;
  const { clock, flight, strike, sensor, link } = missionAt(BLANK_SOURCE);
  return { phase, clock, flight, strike, sensor, link, load, playing, view };
}

class DoubleBufferedAssemblyState {
  private heldByAssembly = blankState();
  private free = blankState();

  handOver(source: AssemblySource): AssemblyState {
    const next = copyInto(this.free, source);
    this.free = this.heldByAssembly;
    this.heldByAssembly = next;
    return next;
  }
}

export function bindStore(store: ReaperStore, targets: SceneTargets): () => void {
  const { reaper, labelVisibility } = targets;
  const assemblyState = new DoubleBufferedAssemblyState();
  const drawnLabels = new DrawnLabels(labelVisibility);
  const handOver = (state: AssemblySource) => {
    const next = assemblyState.handOver(state);
    drawnLabels.follow(next);
    return next;
  };
  const push = (state: AssemblySource) => reaper.setState(handOver(state));
  reaper.build(handOver(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    bindPresets<ReaperStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: reaper.views,
      labels: drawnLabels,
      prepare: push,
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
