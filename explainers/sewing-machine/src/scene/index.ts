import { LabelVisibility } from '@core/scene/labelVisibility';
import type { SceneShell } from '@core/scene/shell';
import type { SewingStore } from '../state';
import { bindStore } from './bindings';
import { LABEL_PRIORITY } from './partInfo';
import { SewingController } from './sewingController';

export function mountSewingScene(shell: SceneShell, store: SewingStore): () => void {
  const sewing = new SewingController(shell);
  const labelVisibility = new LabelVisibility(shell.labels, shell.rig.camera, LABEL_PRIORITY);
  const removeResize = shell.viewport.onResize((size) => labelVisibility.setViewport(size));
  const unbind = bindStore(store, { sewing, labelVisibility, ...shell });
  const removeFrame = shell.onFrame(() => {
    sewing.update(store.getState());
    labelVisibility.update();
  });
  return () => {
    removeFrame();
    removeResize();
    unbind();
    sewing.dispose();
  };
}
