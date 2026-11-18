import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import { PRESETS, createAssemblyState, writeAssemblyState } from '../state';
import type { AssemblySource, FlavorStore, FlavorStoreState, Preset } from '../state';
import type { FlavorController } from './controller';
import { ScaleLabelPolicy, highlightForScale } from './scaleLabels';
import type { ScaleSource } from './scaleLabels';

export interface SceneTargets extends PresetTargets {
  flavor: Pick<FlavorController, 'build' | 'setState' | 'views'>;
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

function scaleFlippedInChapter(state: FlavorStoreState, previous: FlavorStoreState): boolean {
  return state.scale !== previous.scale && state.preset === previous.preset;
}

function scaleSourceOf(state: FlavorStoreState): ScaleSource {
  return { scale: state.scale, camera: PRESETS[state.preset].camera };
}

export async function bindStore(store: FlavorStore, targets: SceneTargets): Promise<() => void> {
  const { flavor, labelVisibility, highlighter } = targets;
  const assemblyState = new DoubleBufferedAssemblyState(store.getState());
  const push = (state: AssemblySource) => flavor.setState(assemblyState.handOver(state));
  const labels = new ScaleLabelPolicy(labelVisibility, () => scaleSourceOf(store.getState()));
  const highlightOf = (preset: Preset, state: FlavorStoreState) =>
    highlightForScale(preset.highlight, scaleSourceOf(state));
  const onScale = (state: FlavorStoreState, previous: FlavorStoreState) => {
    if (!scaleFlippedInChapter(state, previous)) return;
    const preset = PRESETS[state.preset];
    flavor.views.frame(preset.camera, true, state.scale);
    highlighter.setHighlight(highlightOf(preset, state));
    labels.refresh();
  };
  await flavor.build(assemblyState.handOver(store.getState()));
  push(store.getState());
  const unsubscribers = [
    store.subscribe(push),
    bindPresets<FlavorStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: flavor.views,
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
