import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState, PropellantId } from '../ids';
import { DEFAULT_VIEW, PRESETS, presetHighlight } from '../state';
import type { Preset, RaptorState, RaptorStore, RaptorStoreState } from '../state';
import type { RaptorController } from './controller';
import { PART_IDS } from './partInfo';

export interface SceneTargets extends PresetTargets {
  raptor: RaptorController;
  labelVisibility: LabelPolicy;
}

function blankState(): AssemblyState {
  return { phase: 0, propellant: null, playing: false, view: DEFAULT_VIEW };
}

function emphasisedPropellant(state: RaptorState): PropellantId | null {
  return PRESETS[state.preset].controls?.includes('propellant') ? state.propellant : null;
}

function copyInto(target: AssemblyState, state: RaptorState): AssemblyState {
  target.phase = state.phase;
  target.propellant = emphasisedPropellant(state);
  target.playing = state.playing;
  target.view = state.view;
  return target;
}

class DoubleBufferedAssemblyState {
  private heldByAssembly = blankState();
  private free = blankState();

  handOver(state: RaptorState): AssemblyState {
    const next = copyInto(this.free, state);
    this.free = this.heldByAssembly;
    this.heldByAssembly = next;
    return next;
  }
}

function highlightSelection(store: RaptorStore, targets: SceneTargets): () => void {
  return store.subscribe(
    (state) => state.propellant,
    () => {
      const state = store.getState();
      targets.highlighter.setHighlight(presetHighlight(PRESETS[state.preset], state));
    },
  );
}

export function bindStore(store: RaptorStore, targets: SceneTargets): () => void {
  const { raptor, labelVisibility } = targets;
  const assemblyState = new DoubleBufferedAssemblyState();
  const push = (state: RaptorState) => raptor.setState(assemblyState.handOver(state));
  raptor.build(assemblyState.handOver(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    highlightSelection(store, targets),
    bindPresets<RaptorStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: raptor.views,
      parts: PART_IDS,
      labels: labelVisibility,
      prepare: push,
      highlight: presetHighlight,
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
