import type { CameraRig } from '@core/scene/camera';
import type { Highlighter } from '@core/scene/highlight';
import type { LabelVisibility } from '@core/scene/labelVisibility';
import { PRESETS } from '../state';
import type { GliderState, GliderStore, PartId, Preset } from '../state';
import type { GliderController } from './gliderController';
import { GLIDER_PARTS, PART_IDS } from './partInfo';

export interface SceneTargets {
  glider: GliderController;
  rig: CameraRig;
  highlighter: Highlighter;
  labelVisibility: LabelVisibility;
}

function showLabels(state: GliderState, labelVisibility: LabelVisibility): void {
  const presetLabels = new Set<PartId>(PRESETS[state.preset].labels);
  labelVisibility.setWanted(state.view.labels ? new Set(PART_IDS) : presetLabels, presetLabels);
}

function emphasis(preset: Preset): readonly PartId[] {
  const { highlight } = preset;
  const aboutGlider = highlight.some((part) => GLIDER_PARTS.includes(part));
  return highlight.length === 0 || aboutGlider ? highlight : [...highlight, ...GLIDER_PARTS];
}

function framePreset(store: GliderStore, targets: SceneTargets, animate: boolean): void {
  const state = store.getState();
  const view = PRESETS[state.preset].camera;
  targets.glider.update(state);
  targets.rig.follow(targets.glider.followAnchor(view));
  const pose = targets.glider.pose(view, targets.rig.framing());
  if (!pose) return;
  if (animate) targets.rig.tweenTo(pose);
  else targets.rig.jumpTo(pose);
}

function presentPreset(store: GliderStore, targets: SceneTargets, animate: boolean): void {
  const state = store.getState();
  framePreset(store, targets, animate);
  targets.highlighter.setHighlight(emphasis(PRESETS[state.preset]));
  showLabels(state, targets.labelVisibility);
}

export function bindStore(store: GliderStore, targets: SceneTargets): () => void {
  const { glider, labelVisibility } = targets;
  glider.build(store.getState());
  labelVisibility.setAnchors(glider.labelAnchors());
  presentPreset(store, targets, false);

  const unsubscribers = [
    store.subscribe(
      (state) => state.view,
      (view) => {
        glider.applyView(view);
        showLabels(store.getState(), labelVisibility);
      },
    ),
    store.subscribe(
      (state) => state.glider,
      (type) => glider.setGlider(type),
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
