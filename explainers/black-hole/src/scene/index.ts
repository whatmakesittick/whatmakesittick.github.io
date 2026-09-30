import { Box3, Vector3 } from 'three';
import type { CameraRig } from '@core/scene/camera';
import type { SceneShell } from '@core/scene/shell';
import type { BlackHoleStore } from '../state';
import { HERO_CAMERA, NO_FLOOR, SCENE_EXTENT } from './constants';
import { LensedSky } from './lensedSky';

export { SCENE_OPTIONS } from './sceneOptions';

function placeCamera(rig: CameraRig): void {
  const extent = new Vector3(SCENE_EXTENT, SCENE_EXTENT, SCENE_EXTENT);
  rig.setBounds(new Box3().setFromCenterAndSize(new Vector3(), extent), NO_FLOOR);
  rig.jumpTo({
    position: new Vector3(...HERO_CAMERA.position),
    target: new Vector3(...HERO_CAMERA.target),
  });
}

export function mountBlackHoleScene(shell: SceneShell, store: BlackHoleStore): () => void {
  const sky = new LensedSky(shell.materials);
  shell.scene.add(sky.mesh);
  void sky.prepare(shell.viewport.renderer).then(() => shell.invalidate());
  placeCamera(shell.rig);
  sky.setDiscShown(store.getState().view.disc);
  const removeFrame = shell.onFrame(() => {
    const state = store.getState();
    sky.setTime(state.phase);
    return state.playing;
  });
  const unsubscribe = store.subscribe(
    (state) => state.view.disc,
    (disc) => {
      sky.setDiscShown(disc);
      shell.invalidate();
    },
  );
  return () => {
    removeFrame();
    unsubscribe();
    shell.scene.remove(sky.mesh);
    sky.dispose();
  };
}
