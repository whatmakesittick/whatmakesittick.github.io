import type { CameraRig } from '@core/scene/camera';
import type { Highlighter } from '@core/scene/highlight';
import { PRESETS } from '../state';
import type { PartId, SewingState, SewingStore } from '../state';
import type { LabelVisibility } from './labelVisibility';
import { PART_IDS } from './partInfo';
import type { SewingController } from './sewingController';

export interface SceneTargets {
  sewing: SewingController;
  rig: CameraRig;
  highlighter: Highlighter;
  labelVisibility: LabelVisibility;
}

function showLabels(state: SewingState, labelVisibility: LabelVisibility): void {
  const presetLabels = new Set<PartId>(PRESETS[state.preset].labels);
  labelVisibility.setWanted(state.view.labels ? new Set(PART_IDS) : presetLabels, presetLabels);
}

function framePreset(store: SewingStore, targets: SceneTargets, animate: boolean): void {
  const state = store.getState();
  const pose = targets.sewing.pose(PRESETS[state.preset].camera, targets.rig.framing());
  if (!pose) return;
  if (animate) targets.rig.tweenTo(pose);
  else targets.rig.jumpTo(pose);
}

function presentPreset(store: SewingStore, targets: SceneTargets, animate: boolean): void {
  const state = store.getState();
  framePreset(store, targets, animate);
  targets.highlighter.setHighlight(PRESETS[state.preset].highlight);
  showLabels(state, targets.labelVisibility);
}

export function bindStore(store: SewingStore, targets: SceneTargets): () => void {
  const { sewing, labelVisibility } = targets;
  sewing.build(store.getState());
  labelVisibility.setAnchors(sewing.labelAnchors());
  presentPreset(store, targets, false);

  const unsubscribers = [
    store.subscribe(
      (state) => state.view,
      (view) => {
        sewing.applyView(view);
        showLabels(store.getState(), labelVisibility);
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
