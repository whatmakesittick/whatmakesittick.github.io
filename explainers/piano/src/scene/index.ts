import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import { mountSound } from '../audio/bindSound';
import type { PianoStore } from '../state';
import { bindStore } from './bindings';
import { PianoController } from './controller';
import { pianoLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountPianoScene(shell: SceneShell, store: PianoStore): () => void {
  const restoreLight = pianoLight(shell.lighting);
  const piano = new PianoController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => piano.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { piano, labelVisibility, ...shell });
  const stopSound = mountSound(store);
  return () => {
    stopSound();
    removeFrame();
    labelVisibility.dispose();
    unbind();
    piano.dispose();
    restoreLight();
  };
}
