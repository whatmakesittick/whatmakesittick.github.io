import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import { minuteOf } from '../state';
import type { SolarPanelStore } from '../state';
import { bindStore } from './bindings';
import { SolarPanelController } from './controller';
import { daylight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountSolarPanelScene(shell: SceneShell, store: SolarPanelStore): () => void {
  const light = daylight(shell.lighting);
  const followSun = store.subscribe(
    (state) => minuteOf(state),
    (minute) => light.follow(minute),
    { fireImmediately: true },
  );
  const solarPanel = new SolarPanelController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => solarPanel.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { solarPanel, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    solarPanel.dispose();
    followSun();
    light.restore();
  };
}
