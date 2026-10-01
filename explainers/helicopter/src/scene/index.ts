import { bindPresets } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import { PRESETS } from '../state';
import type { HelicopterStore } from '../state';
import { HelicopterController } from './helicopterController';

export function mountHelicopterScene(shell: SceneShell, store: HelicopterStore): () => void {
  const helicopter = new HelicopterController(shell);
  helicopter.build(store.getState());
  const unbind = bindPresets(shell, store, {
    presets: PRESETS,
    views: helicopter.views,
    onView: (view) => helicopter.applyView(view),
  });
  const removeFrame = shell.onFrame((deltaSeconds) =>
    helicopter.update(store.getState(), deltaSeconds),
  );
  return () => {
    removeFrame();
    unbind();
    helicopter.dispose();
  };
}
