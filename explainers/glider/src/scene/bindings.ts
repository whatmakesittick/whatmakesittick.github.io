import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import { PRESETS } from '../state';
import type { GliderStore, PartId, Preset } from '../state';
import type { GliderController } from './gliderController';
import { GLIDER_PARTS, PART_IDS } from './partInfo';

export interface SceneTargets extends PresetTargets {
  glider: GliderController;
  labelVisibility: LabelPolicy;
}

function emphasis(preset: Preset): readonly PartId[] {
  const { highlight } = preset;
  const aboutGlider = highlight.some((part) => GLIDER_PARTS.includes(part));
  return highlight.length === 0 || aboutGlider ? highlight : [...highlight, ...GLIDER_PARTS];
}

export function bindStore(store: GliderStore, targets: SceneTargets): () => void {
  const { glider, labelVisibility } = targets;
  glider.build(store.getState());
  const unsubscribers = [
    bindPresets(targets, store, {
      presets: PRESETS,
      views: glider.views,
      parts: PART_IDS,
      labels: labelVisibility,
      prepare: (state) => glider.update(state),
      onView: (view) => glider.applyView(view),
      highlight: emphasis,
    }),
    store.subscribe(
      (state) => state.glider,
      (type) => glider.setGlider(type),
    ),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
