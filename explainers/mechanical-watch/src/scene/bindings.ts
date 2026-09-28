import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import { DEFAULT_AMPLITUDE } from '../model';
import {
  DEFAULT_VIEW,
  PRESETS,
  REGULATOR_RANGE,
  RESERVE_RANGE,
  amplitudeOf,
  presetHighlight,
} from '../state';
import type { Preset, WatchState, WatchStore, WatchStoreState } from '../state';
import type { WatchController } from './controller';
import { PART_IDS } from './partInfo';

export interface SceneTargets extends PresetTargets {
  watch: WatchController;
  labelVisibility: LabelPolicy;
}

function blankState(): AssemblyState {
  return {
    phase: 0,
    cycles: 0,
    amplitude: DEFAULT_AMPLITUDE,
    reserve: RESERVE_RANGE.default,
    regulator: REGULATOR_RANGE.default,
    view: DEFAULT_VIEW,
  };
}

function copyInto(target: AssemblyState, state: WatchState): AssemblyState {
  target.phase = state.phase;
  target.cycles = state.cycles;
  target.amplitude = amplitudeOf(state);
  target.reserve = state.reserve;
  target.regulator = state.regulator;
  target.view = state.view;
  return target;
}

class DoubleBufferedAssemblyState {
  private heldByAssembly = blankState();
  private free = blankState();

  handOver(state: WatchState): AssemblyState {
    const next = copyInto(this.free, state);
    this.free = this.heldByAssembly;
    this.heldByAssembly = next;
    return next;
  }
}

function highlightOf(preset: Preset, state: WatchState): readonly string[] {
  return presetHighlight(preset, state.wheel);
}

function followSelectedWheel(store: WatchStore, targets: SceneTargets): () => void {
  const { watch, highlighter } = targets;
  watch.followWheel(store.getState().wheel);
  return store.subscribe(
    (state) => state.wheel,
    (wheel) => {
      const state = store.getState();
      watch.followWheel(wheel);
      highlighter.setHighlight(highlightOf(PRESETS[state.preset], state));
    },
  );
}

export function bindStore(store: WatchStore, targets: SceneTargets): () => void {
  const { watch, labelVisibility } = targets;
  const assemblyState = new DoubleBufferedAssemblyState();
  const push = (state: WatchState) => watch.setState(assemblyState.handOver(state));
  watch.build(assemblyState.handOver(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    followSelectedWheel(store, targets),
    bindPresets<WatchStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: watch.views,
      parts: PART_IDS,
      labels: labelVisibility,
      prepare: push,
      highlight: highlightOf,
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
