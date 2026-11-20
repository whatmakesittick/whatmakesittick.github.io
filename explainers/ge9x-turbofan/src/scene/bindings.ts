import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import { PRESETS, createAssemblyState, writeAssemblyState } from '../state';
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

export async function bindStore(store: EngineStore, targets: SceneTargets): Promise<() => void> {
  const { engine, labelVisibility, highlighter } = targets;
  const buffers = new DoubleBufferedAssemblyState(store.getState(), engine.detail());
  const handOver = (state: AssemblySource) => buffers.handOver(state, engine.detail());
  const push = (state: AssemblySource) => engine.setState(handOver(state));
  await engine.build(handOver(store.getState()));
  push(store.getState());
  const unsubscribers = [
    store.subscribe(push),
    bindPresets<EngineStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: engine.views,
      labels: labelVisibility,
      prepare: push,
      onView: (_view, state) => push(state),
      highlight: highlightFor,
    }),
    store.subscribe(
      (state) => state.streams,
      (streams) =>
        highlighter.setHighlight(highlightFor(PRESETS[store.getState().preset], { streams })),
    ),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
