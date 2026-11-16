import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import { PRESETS, createAssemblyState, writeAssemblyState } from '../state';
import type { AssemblySource, ClockStore, ClockStoreState, Preset } from '../state';
import type { ClockController } from './controller';
import { ScaleLabelPolicy, highlightForScale } from './scaleLabels';
import type { ScaleSource } from './scaleLabels';

export interface SceneTargets extends PresetTargets {
  clock: Pick<ClockController, 'build' | 'setState' | 'views'>;
  labelVisibility: LabelPolicy;
}

class DoubleBufferedAssemblyState {
  private heldByAssembly: AssemblyState;
  private free: AssemblyState;

  constructor(source: AssemblySource) {
    this.heldByAssembly = createAssemblyState(source);
    this.free = createAssemblyState(source);
  }

  handOver(source: AssemblySource): AssemblyState {
    const next = writeAssemblyState(this.free, source);
    this.free = this.heldByAssembly;
    this.heldByAssembly = next;
    return next;
  }
}

function scaleFlippedInChapter(state: ClockStoreState, previous: ClockStoreState): boolean {
  return state.scale !== previous.scale && state.preset === previous.preset;
}

function scaleSourceOf(state: ClockStoreState): ScaleSource {
  return { scale: state.scale, camera: PRESETS[state.preset].camera };
}

export function bindStore(store: ClockStore, targets: SceneTargets): () => void {
  const { clock, labelVisibility, highlighter } = targets;
  const assemblyState = new DoubleBufferedAssemblyState(store.getState());
  const push = (state: AssemblySource) => clock.setState(assemblyState.handOver(state));
  const labels = new ScaleLabelPolicy(labelVisibility, () => scaleSourceOf(store.getState()));
  const highlightOf = (preset: Preset, state: ClockStoreState) =>
    highlightForScale(preset.highlight, scaleSourceOf(state));
  const onScale = (state: ClockStoreState, previous: ClockStoreState) => {
    if (!scaleFlippedInChapter(state, previous)) return;
    const preset = PRESETS[state.preset];
    clock.views.frame(preset.camera, true, state.scale);
    highlighter.setHighlight(highlightOf(preset, state));
    labels.refresh();
  };
  clock.build(assemblyState.handOver(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    bindPresets<ClockStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: clock.views,
      labels,
      variant: (state) => state.scale,
      prepare: push,
      onView: (_view, state) => push(state),
      highlight: highlightOf,
    }),
    store.subscribe(onScale),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
