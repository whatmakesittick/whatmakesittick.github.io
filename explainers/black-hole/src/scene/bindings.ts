import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import { DEFAULT_VIEW, PRESETS } from '../state';
import type { BlackHoleState, BlackHoleStore, BlackHoleStoreState, Preset } from '../state';
import type { BlackHoleController } from './controller';
import { PART_IDS } from './partInfo';

export interface SceneTargets extends PresetTargets {
  blackHole: BlackHoleController;
  labelVisibility: LabelPolicy;
}

function blankState(): AssemblyState {
  return { phase: 0, playing: false, view: DEFAULT_VIEW };
}

function copyInto(target: AssemblyState, state: BlackHoleState): AssemblyState {
  target.phase = state.phase;
  target.playing = state.playing;
  target.view = state.view;
  return target;
}

class DoubleBufferedAssemblyState {
  private heldByAssembly = blankState();
  private free = blankState();

  handOver(state: BlackHoleState): AssemblyState {
    const next = copyInto(this.free, state);
    this.free = this.heldByAssembly;
    this.heldByAssembly = next;
    return next;
  }
}

export function bindStore(store: BlackHoleStore, targets: SceneTargets): () => void {
  const { blackHole, labelVisibility } = targets;
  const assemblyState = new DoubleBufferedAssemblyState();
  const push = (state: BlackHoleState) => blackHole.setState(assemblyState.handOver(state));
  blackHole.build(assemblyState.handOver(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    bindPresets<BlackHoleStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: blackHole.views,
      parts: PART_IDS,
      labels: labelVisibility,
      prepare: push,
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
