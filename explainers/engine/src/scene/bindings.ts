import { shallow } from 'zustand/vanilla/shallow';
import { bindPresets } from '@core/scene/presetBinder';
import type { PresetTargets } from '@core/scene/presetBinder';
import { PRESETS } from '../state';
import type { EngineStore } from '../state';
import type { EngineController } from './engineController';

export interface SceneTargets extends PresetTargets {
  engine: EngineController;
}

export function bindStore(store: EngineStore, targets: SceneTargets): () => void {
  const { engine } = targets;
  engine.rebuild(store.getState());

  const unsubscribers = [
    store.subscribe(
      (state) => [state.layout, state.engineType, state.view.cutaway],
      () => engine.rebuild(store.getState()),
      { equalityFn: shallow },
    ),
    store.subscribe(
      (state) => state.compressionRatio,
      () => engine.applyCompression(store.getState()),
    ),
    bindPresets(targets, store, {
      presets: PRESETS,
      views: engine.views,
      variant: (state) => state.layout,
      onView: (view) => engine.applyView(view),
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
