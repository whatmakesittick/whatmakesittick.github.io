import type { SceneShell } from '@core/scene/shell';
import type { EngineStore } from '../state';
import { bindStore } from './bindings';
import { EngineController } from './engineController';

export function mountEngineScene(shell: SceneShell, store: EngineStore): () => void {
  const engine = new EngineController(shell);
  const unbind = bindStore(store, { engine, ...shell });
  shell.onFrame((deltaSeconds) => engine.update(store.getState(), deltaSeconds));
  return () => {
    unbind();
    engine.dispose();
  };
}
