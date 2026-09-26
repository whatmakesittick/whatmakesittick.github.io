import { Color, Scene } from 'three';
import type { PartInfo } from '../explainer';
import { THEME } from '../theme';
import { CameraRig } from './camera';
import { MAX_FRAME_SECONDS } from './constants';
import { Highlighter } from './highlight';
import { LabelLayer } from './labels';
import { createLighting } from './lighting';
import type { Lighting } from './lighting';
import { startLoop } from './loop';
import type { Loop } from './loop';
import { MaterialLibrary, STRUCTURE_GROUP } from './materials';
import { Stage } from './stage';
import { createSceneTextures } from './textures';
import type { SceneTextures } from './textures';
import { createViewport } from './viewport';
import type { Viewport } from './viewport';

export type FrameUpdate = (deltaSeconds: number) => void;

export interface SceneShell {
  viewport: Viewport;
  scene: Scene;
  rig: CameraRig;
  labels: LabelLayer;
  highlighter: Highlighter;
  materials: MaterialLibrary;
  textures: SceneTextures;
  stage: Stage;
  lighting: Lighting;
  onFrame(update: FrameUpdate): void;
}

export interface SceneHost {
  shell: SceneShell;
  start(tick: FrameUpdate): void;
  dispose(): void;
}

export function createSceneHost(
  container: HTMLElement,
  parts: Readonly<Record<string, PartInfo>>,
): SceneHost {
  const viewport = createViewport(container);
  const scene = new Scene();
  scene.background = new Color(THEME.background);
  const lighting = createLighting(scene, viewport.renderer);
  const textures = createSceneTextures();
  const stage = new Stage(textures.shadow);
  scene.add(stage.group);
  const materials = new MaterialLibrary();
  const highlighter = new Highlighter(materials, [...Object.keys(parts), STRUCTURE_GROUP]);
  const labels = new LabelLayer(parts);
  const rig = new CameraRig(viewport.renderer.domElement);
  viewport.onResize((size) => {
    rig.setViewport(size);
    labels.setViewport(size);
  });
  const updates: FrameUpdate[] = [];
  let loop: Loop | undefined;

  const shell: SceneShell = {
    viewport,
    scene,
    rig,
    labels,
    highlighter,
    materials,
    textures,
    stage,
    lighting,
    onFrame: (update) => updates.push(update),
  };

  const renderFrame = (tick: FrameUpdate, deltaSeconds: number) => {
    const step = Math.min(deltaSeconds, MAX_FRAME_SECONDS);
    tick(step);
    updates.forEach((update) => update(step));
    highlighter.update(step);
    rig.update(step);
    viewport.render(scene, rig.camera);
    labels.layout(viewport.element);
  };

  return {
    shell,
    start: (tick) => {
      loop?.stop();
      loop = startLoop((deltaSeconds) => renderFrame(tick, deltaSeconds));
    },
    dispose: () => {
      loop?.stop();
      labels.dispose();
      rig.dispose();
      stage.dispose();
      materials.dispose();
      textures.dispose();
      lighting.dispose();
      viewport.dispose();
    },
  };
}
