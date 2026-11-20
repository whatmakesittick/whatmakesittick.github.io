import type { Box3, Object3D } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import { runPaced } from '@core/scene/pacing';
import type { Steps } from '@core/scene/pacing';
import type { SceneShell } from '@core/scene/shell';
import { whenIdle } from '@core/scene/warmUp';
import type { AssemblyState, CameraView, DetailId } from '../ids';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { CAMERA_VIEWS, HERO_REGION, heroBounds } from './cameraViews';
import type { ViewRegion } from './cameraViews';
import { detailFor, isCoarsePointer } from './detail';

export type EngineControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig' | 'viewport'
>;

export type ViewFramer = Pick<CameraViews<CameraView>, 'frame'>;

async function resolved(built: Assembly | Steps<Assembly>): Promise<Assembly> {
  return 'root' in built ? built : runPaced(built);
}

export class EngineController {
  readonly views: ViewFramer;
  private readonly dependencies: EngineControllerDependencies;
  private readonly cameraViews: CameraViews<CameraView, ViewRegion>;
  private assembly: Assembly | null = null;
  private cancelWarmUp: () => void = () => {};
  private generation = 0;

  constructor(dependencies: EngineControllerDependencies) {
    this.dependencies = dependencies;
    this.cameraViews = new CameraViews<CameraView, ViewRegion>(dependencies.rig, {
      views: CAMERA_VIEWS,
      region: (id) => this.regionOf(id),
    });
    this.views = { frame: (view, animate) => this.cameraViews.frame(view, animate) };
  }

  async build(state: AssemblyState): Promise<void> {
    const { scene, materials, textures, labels, rig } = this.dependencies;
    this.dispose();
    const generation = this.generation;
    const assembly = await resolved(createAssembly({ materials, textures }, state));
    if (generation !== this.generation) {
      assembly.dispose();
      return;
    }
    this.assembly = assembly;
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    const bounds = assembly.region('all');
    rig.setBounds(bounds, bounds.min.y);
    this.cancelWarmUp = whenIdle(() => assembly.warmUp?.((object) => this.compileHidden(object)));
  }

  detail(): DetailId {
    return detailFor(this.cameraDistance(), isCoarsePointer());
  }

  setState(state: AssemblyState): void {
    this.assembly?.setState(state);
  }

  update(deltaSeconds: number): boolean {
    return this.assembly?.update(deltaSeconds, this.cameraDistance()) ?? false;
  }

  dispose(): void {
    this.generation += 1;
    this.cancelWarmUp();
    this.assembly?.root.removeFromParent();
    this.assembly?.dispose();
    this.assembly = null;
  }

  private cameraDistance(): number {
    const { rig } = this.dependencies;
    return rig.camera.position.distanceTo(rig.controls.target);
  }

  private regionOf(id: ViewRegion): Box3 | null {
    const { assembly } = this;
    if (!assembly) return null;
    return id === HERO_REGION ? heroBounds(assembly.region('fanFace')) : assembly.region(id);
  }

  private compileHidden(object: Object3D): void {
    const { viewport, rig, scene } = this.dependencies;
    const shown = object.visible;
    object.visible = true;
    void viewport.renderer.compileAsync(object, rig.camera, scene);
    object.visible = shown;
  }
}
