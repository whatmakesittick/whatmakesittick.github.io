import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import {
  PRESETS,
  STARTER_LOOK,
  createAssemblyState,
  lookPreset,
  writeAssemblyState,
} from '../state';
import type { AssemblySource, EngineStore, EngineStoreState, Preset } from '../state';
import type { EngineController } from './controller';
import { highlightFor } from './streamHighlight';

export interface SceneTargets extends PresetTargets {
  engine: Pick<EngineController, 'build' | 'setState' | 'views' | 'detail'>;
  labelVisibility: LabelPolicy;
}

class DoubleBufferedAssemblyState {
  private heldByAssembly: AssemblyState;
  private free: AssemblyState;

  constructor(source: AssemblySource, detail: AssemblyState['detail']) {
    this.heldByAssembly = createAssemblyState(source, detail);
    this.free = createAssemblyState(source, detail);
  }

  handOver(source: AssemblySource, detail: AssemblyState['detail']): AssemblyState {
    const next = writeAssemblyState(this.free, source, detail);
    this.free = this.heldByAssembly;
    this.heldByAssembly = next;
    return next;
  }
}

const NO_LABELS: ReadonlySet<string> = new Set();

function lookOf(store: EngineStore): Preset {
  const { preset, look } = store.getState();
  return lookPreset(PRESETS[preset], look);
}

function lookLabels(store: EngineStore, labels: LabelPolicy): LabelPolicy {
  return {
    setWanted: (wanted, pinned) => {
      if (wanted.size === 0) return labels.setWanted(wanted, pinned);
      const looked = new Set<string>(lookOf(store).labels);
      labels.setWanted(looked, looked);
    },
  };
}

function bindLook(store: EngineStore, targets: SceneTargets, labels: LabelPolicy): () => void {
  const { engine, highlighter } = targets;
  return store.subscribe(
    (state) => state.look,
    () => {
      const state = store.getState();
      const preset = lookOf(store);
      engine.views.frame(preset.camera, true);
      highlighter.setHighlight(highlightFor(preset, state));
      const shown = new Set<string>(preset.labels);
      if (state.view.labels) labels.setWanted(shown, shown);
      else labels.setWanted(NO_LABELS, NO_LABELS);
    },
  );
}

export async function bindStore(store: EngineStore, targets: SceneTargets): Promise<() => void> {
  const { engine, highlighter } = targets;
  const labelVisibility = lookLabels(store, targets.labelVisibility);
  const buffers = new DoubleBufferedAssemblyState(store.getState(), engine.detail());
  const handOver = (state: AssemblySource) => buffers.handOver(state, engine.detail());
  const push = (state: AssemblySource) => engine.setState(handOver(state));
  await engine.build(handOver(store.getState()));
  push(store.getState());
  const unsubscribers = [
    store.subscribe(push),
    bindPresets<EngineStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: {
        frame: (camera, animate, variant) =>
          engine.views.frame(
            store.getState().look === 'starter' ? STARTER_LOOK.camera : camera,
            animate,
            variant,
          ),
      },
      labels: labelVisibility,
      prepare: push,
      onView: (_view, state) => push(state),
      highlight: (preset, state) => highlightFor(lookPreset(preset, state.look), state),
    }),
    bindLook(store, targets, labelVisibility),
    store.subscribe(
      (state) => state.streams,
      (streams) =>
        highlighter.setHighlight(highlightFor(PRESETS[store.getState().preset], { streams })),
    ),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
