import { bindPresets, createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import { PRESETS } from '../state';
import type { SewingStore } from '../state';
import { LABEL_PRIORITY, PART_IDS } from './partInfo';
import { SewingController } from './sewingController';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountSewingScene(shell: SceneShell, store: SewingStore): () => void {
  const sewing = new SewingController(shell);
  sewing.build(store.getState());
  const removeFrame = shell.onFrame(() => sewing.update(store.getState()));
  const labels = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindPresets(shell, store, {
    presets: PRESETS,
    views: sewing.views,
    parts: PART_IDS,
    labels,
    onView: (view) => sewing.applyView(view),
  });
  return () => {
    removeFrame();
    labels.dispose();
    unbind();
    sewing.dispose();
  };
}
