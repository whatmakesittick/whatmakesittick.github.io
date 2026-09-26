import type { CameraRig } from '@core/scene/camera';
import type { Highlighter } from '@core/scene/highlight';
import type { LabelLayer } from '@core/scene/labels';
import { PRESETS } from '../state';
import type { HelicopterState, HelicopterStore, PartId } from '../state';
import type { HelicopterController } from './helicopterController';
import { PART_IDS } from './partInfo';

export interface SceneTargets {
  helicopter: HelicopterController;
  rig: CameraRig;
  highlighter: Highlighter;
  labels: LabelLayer;
}

function visibleLabels(state: HelicopterState): Set<PartId> {
  return new Set(state.view.labels ? PART_IDS : PRESETS[state.preset].labels);
}

function framePreset(store: HelicopterStore, targets: SceneTargets, animate: boolean): void {
  const state = store.getState();
  const pose = targets.helicopter.pose(PRESETS[state.preset].camera, targets.rig.framing());
  if (!pose) return;
  if (animate) targets.rig.tweenTo(pose);
  else targets.rig.jumpTo(pose);
}

function presentPreset(store: HelicopterStore, targets: SceneTargets, animate: boolean): void {
  const state = store.getState();
  framePreset(store, targets, animate);
  targets.highlighter.setHighlight(PRESETS[state.preset].highlight);
  targets.labels.show(visibleLabels(state));
}

export function bindStore(store: HelicopterStore, targets: SceneTargets): () => void {
  const { helicopter, labels } = targets;
  helicopter.build(store.getState());
  presentPreset(store, targets, false);

  const unsubscribers = [
    store.subscribe(
      (state) => state.view,
      (view) => {
        helicopter.applyView(view);
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
