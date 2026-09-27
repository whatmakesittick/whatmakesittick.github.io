import { Color, Fog, Scene } from 'three';
import type { PartInfo } from '../explainer';
import { THEME } from '../theme';
import { CameraRig } from './camera';
import type { CameraOptions } from './camera';
import { MAX_FRAME_SECONDS } from './constants';
import { Highlighter } from './highlight';
import { LabelLayer } from './labels';
import { createLighting } from './lighting';
import type { Lighting } from './lighting';
import { Listeners } from './listeners';
import { startLoop } from './loop';
import type { Loop } from './loop';
import { MaterialLibrary, STRUCTURE_GROUP } from './materials';
import { Stage } from './stage';
import { createSceneTextures } from './textures';
import type { SceneTextures } from './textures';
import { createViewport } from './viewport';
import type { Viewport } from './viewport';

export type FrameUpdate = (deltaSeconds: number) => void;

export interface FogOptions {
  color: string;
  near: number;
  far: number;
}

export interface SceneOptions {
  background?: string;
  fog?: FogOptions;
  stage?: boolean;
  camera?: CameraOptions;
}

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
  onFrame(update: FrameUpdate): () => void;
}

export interface SceneHost {
  shell: SceneShell;
  start(tick: FrameUpdate): void;
  dispose(): void;
}

function createScene(options: SceneOptions): Scene {
  const scene = new Scene();
  scene.background = new Color(options.background ?? THEME.background);
  if (options.fog) scene.fog = new Fog(options.fog.color, options.fog.near, options.fog.far);
  return scene;
}

export function createSceneHost(
  container: HTMLElement,
  parts: Readonly<Record<string, PartInfo>>,
  options: SceneOptions = {},
): SceneHost {
  const viewport = createViewport(container);
  const scene = createScene(options);
  const lighting = createLighting(scene, viewport.renderer);
  const textures = createSceneTextures();
  const stage = new Stage(textures.shadow);
  if (options.stage ?? true) scene.add(stage.group);
  const materials = new MaterialLibrary();
  const highlighter = new Highlighter(materials, [...Object.keys(parts), STRUCTURE_GROUP]);
  const labels = new LabelLayer(parts);
  const rig = new CameraRig(viewport.renderer.domElement, options.camera);
  viewport.onResize((size) => {
    rig.setViewport(size);
    labels.setViewport(size);
  });
  const updates = new Listeners<[deltaSeconds: number]>();
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
    onFrame: (update) => updates.add(update),
  };

  const renderFrame = (tick: FrameUpdate, deltaSeconds: number) => {
    const step = Math.min(deltaSeconds, MAX_FRAME_SECONDS);
    tick(step);
    updates.notify(step);
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
      updates.clear();
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
