import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import {
  DEFAULT_CHAMBER,
  DEFAULT_VALVE,
  DEFAULT_VIEW,
  PRESETS,
  presetHighlight,
  timeOf,
} from '../state';
import type { HeartState, HeartStore, HeartStoreState, Preset, PresetId } from '../state';
import type { HeartController } from './controller';
import { PART_IDS } from './partInfo';

const VALVE_PRESET: PresetId = 'valves';
const VALVE_VIEW = 'valve';

export interface SceneTargets extends PresetTargets {
  heart: HeartController;
  labelVisibility: LabelPolicy;
}

function blankState(): AssemblyState {
  return { time: 0, chamber: DEFAULT_CHAMBER, valve: DEFAULT_VALVE, view: DEFAULT_VIEW };
}

function copyInto(target: AssemblyState, state: HeartState): AssemblyState {
  target.time = timeOf(state);
  target.chamber = state.chamber;
  target.valve = state.valve;
  target.view = state.view;
  return target;
}

class DoubleBufferedAssemblyState {
  private heldByAssembly = blankState();
  private free = blankState();

  handOver(state: HeartState): AssemblyState {
    const next = copyInto(this.free, state);
    this.free = this.heldByAssembly;
    this.heldByAssembly = next;
    return next;
  }
}

function highlightSelection(store: HeartStore, targets: SceneTargets): () => void {
  const refresh = () => {
    const state = store.getState();
    targets.highlighter.setHighlight(presetHighlight(PRESETS[state.preset], state));
  };
  const unsubscribers = [
    store.subscribe((state) => state.chamber, refresh),
    store.subscribe((state) => state.valve, refresh),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

function followSelectedValve(store: HeartStore, targets: SceneTargets): () => void {
  return store.subscribe(
    (state) => state.valve,
    () => {
      if (store.getState().preset === VALVE_PRESET) targets.heart.views.frame(VALVE_VIEW, true);
    },
  );
}

export function bindStore(store: HeartStore, targets: SceneTargets): () => void {
  const { heart, labelVisibility } = targets;
  const assemblyState = new DoubleBufferedAssemblyState();
  const push = (state: HeartState) => heart.setState(assemblyState.handOver(state));
  heart.build(assemblyState.handOver(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    highlightSelection(store, targets),
    followSelectedValve(store, targets),
    bindPresets<HeartStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: heart.views,
      parts: PART_IDS,
      labels: labelVisibility,
      prepare: push,
      highlight: presetHighlight,
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
