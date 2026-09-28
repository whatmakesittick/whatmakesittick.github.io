import { Color, Fog, Scene } from 'three';
import type { PartInfo } from '../explainer';
import { THEME } from '../theme';
import { CameraRig } from './camera';
import type { CameraOptions } from './camera';
import { MAX_FRAME_SECONDS } from './constants';
import { Highlighter } from './highlight';
import { LabelOcclusion } from './labelOcclusion';
import { LabelLayer } from './labels';
import { createLighting } from './lighting';
import type { Lighting } from './lighting';
import { startLoop } from './loop';
import type { Loop } from './loop';
import { MaterialLibrary, STRUCTURE_GROUP } from './materials';
import type { MaterialLibraryOptions } from './materials';
import { Stage } from './stage';
import { createSceneTextures } from './textures';
import type { SceneTextures } from './textures';
import { createViewport } from './viewport';
import type { Viewport } from './viewport';

export type FrameUpdate = (deltaSeconds: number) => boolean | void;

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
  highlight?: MaterialLibraryOptions;
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
  invalidate(): void;
}

export interface PlaybackSource {
  getState(): { tick(deltaSeconds: number): void };
  subscribe(listener: () => void): () => void;
}

export interface SceneHost {
  shell: SceneShell;
  start(playback: PlaybackSource): void;
  dispose(): void;
}

function runUpdates(updates: ReadonlySet<FrameUpdate>, deltaSeconds: number): boolean {
  let moving = false;
  updates.forEach((update) => {
    if (update(deltaSeconds) === true) moving = true;
  });
  return moving;
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
  const materials = new MaterialLibrary(options.highlight);
  const highlighter = new Highlighter(materials, [...Object.keys(parts), STRUCTURE_GROUP]);
  const labels = new LabelLayer(parts);
  const rig = new CameraRig(viewport.renderer.domElement, options.camera);
  const occlusion = new LabelOcclusion(labels, {
    scene,
    camera: rig.camera,
    partOf: (material) => materials.groupOf(material),
    ignored: [stage.group],
  });
  const updates = new Set<FrameUpdate>();
  let loop: Loop | undefined;
  let needsRender = true;
  let disposed = false;
  let stopPlayback = () => {};

  const invalidate = () => {
    needsRender = true;
    loop?.request();
  };
  const removers = [
    viewport.onResize((size) => {
      rig.setViewport(size);
      labels.setViewport(size);
      invalidate();
    }),
    rig.onChange(invalidate),
    labels.onChange(invalidate),
    highlighter.onChange(invalidate),
  ];

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
    onFrame: (update) => {
      updates.add(update);
      return () => updates.delete(update);
    },
    invalidate,
  };

  const renderFrame = (playback: PlaybackSource, deltaSeconds: number) => {
    const step = Math.min(deltaSeconds, MAX_FRAME_SECONDS);
    playback.getState().tick(step);
    if (runUpdates(updates, step)) invalidate();
    if (highlighter.update(step)) {
      occlusion.invalidate();
      invalidate();
    }
    rig.update(step);
    if (occlusion.update(step)) loop?.request();
    if (!needsRender) return;
    needsRender = false;
    viewport.render(scene, rig.camera);
    labels.layout(rig.camera);
  };

  const run = (playback: PlaybackSource) => {
    if (disposed) return;
    loop?.stop();
    stopPlayback();
    loop = startLoop((deltaSeconds) => renderFrame(playback, deltaSeconds));
    stopPlayback = playback.subscribe(invalidate);
    invalidate();
  };

  return {
    shell,
    start: (playback) => {
      void viewport.renderer.compileAsync(scene, rig.camera).then(() => run(playback));
    },
    dispose: () => {
      disposed = true;
      loop?.stop();
      stopPlayback();
      removers.forEach((remove) => remove());
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
