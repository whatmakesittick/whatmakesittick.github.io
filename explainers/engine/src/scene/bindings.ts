import { shallow } from 'zustand/vanilla/shallow';
import type { CameraRig } from '@core/scene/camera';
import type { Highlighter } from '@core/scene/highlight';
import type { LabelLayer } from '@core/scene/labels';
import { PRESETS } from '../state';
import type { EngineState, EngineStore, PartId } from '../state';
import type { EngineController } from './engineController';
import { PART_IDS } from './partInfo';

export interface SceneTargets {
  engine: EngineController;
  rig: CameraRig;
  highlighter: Highlighter;
  labels: LabelLayer;
}

function visibleLabels(state: EngineState): Set<PartId> {
  const preset = PRESETS[state.preset].labels;
  return new Set(state.view.labels ? PART_IDS : preset);
}

function framePreset(store: EngineStore, targets: SceneTargets, animate: boolean): void {
  const state = store.getState();
  const pose = targets.engine.pose(PRESETS[state.preset].camera, targets.rig.framing());
  if (!pose) return;
  if (animate) targets.rig.tweenTo(pose);
  else targets.rig.jumpTo(pose);
}

function presentPreset(store: EngineStore, targets: SceneTargets, animate: boolean): void {
  const state = store.getState();
  framePreset(store, targets, animate);
  targets.highlighter.setHighlight(PRESETS[state.preset].highlight);
  targets.labels.show(visibleLabels(state));
}

export function bindStore(store: EngineStore, targets: SceneTargets): () => void {
  const { engine, labels } = targets;
  const initial = store.getState();
  engine.rebuild(initial);
  presentPreset(store, targets, false);

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
    store.subscribe(
      (state) => state.view,
      (view) => {
        engine.applyView(view);
        labels.show(visibleLabels(store.getState()));
      },
    ),
    store.subscribe(
      (state) => state.preset,
      () => presentPreset(store, targets, true),
    ),
    store.subscribe(
      (state) => state.cameraResetToken,
      () => framePreset(store, targets, true),
    ),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
