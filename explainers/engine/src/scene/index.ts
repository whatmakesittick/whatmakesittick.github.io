import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { EngineStore } from '../state';
import { bindStore } from './bindings';
import { SEE_THROUGH_DIM } from './constants';
import { EngineController } from './engineController';

export const SCENE_OPTIONS: SceneOptions = { highlight: { dim: SEE_THROUGH_DIM } };

export function mountEngineScene(shell: SceneShell, store: EngineStore): () => void {
  const engine = new EngineController(shell);
  const unbind = bindStore(store, { engine, ...shell });
  const removeFrame = shell.onFrame((deltaSeconds) =>
    engine.update(store.getState(), deltaSeconds),
  );
  return () => {
    removeFrame();
    unbind();
    engine.dispose();
  };
}
