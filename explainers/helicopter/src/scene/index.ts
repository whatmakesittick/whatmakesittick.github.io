import type { SceneShell } from '@core/scene/shell';
import type { HelicopterStore } from '../state';
import { bindStore } from './bindings';
import { HelicopterController } from './helicopterController';

export function mountHelicopterScene(shell: SceneShell, store: HelicopterStore): () => void {
  const helicopter = new HelicopterController(shell);
  const unbind = bindStore(store, { helicopter, ...shell });
  const removeFrame = shell.onFrame((deltaSeconds) =>
    helicopter.update(store.getState(), deltaSeconds),
  );
  return () => {
    removeFrame();
    unbind();
    helicopter.dispose();
  };
}
