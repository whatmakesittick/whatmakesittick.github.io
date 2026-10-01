import type { Object3D } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import { whenIdle } from '@core/scene/warmUp';
import type { AssemblyState, RegionId } from '../ids';
import type { CameraView } from '../state';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { CAMERA_VIEWS } from './cameraViews';

export type RaptorControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'stage' | 'rig' | 'viewport'
>;

export class RaptorController {
  readonly views: CameraViews<CameraView, RegionId>;
  private readonly dependencies: RaptorControllerDependencies;
  private assembly: Assembly | null = null;
  private cancelWarmUp: () => void = () => {};

  constructor(dependencies: RaptorControllerDependencies) {
    this.dependencies = dependencies;
    this.views = new CameraViews(dependencies.rig, {
      views: CAMERA_VIEWS,
      region: (id) => this.assembly?.region(id) ?? null,
    });
  }

  build(state: AssemblyState): void {
    const { scene, materials, textures, labels, stage, rig } = this.dependencies;
    this.dispose();
    const assembly = createAssembly({ materials, textures }, state);
    this.assembly = assembly;
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    const bounds = assembly.region('scene');
    rig.setBounds(bounds, bounds.min.y);
    stage.fit(bounds, bounds.min.y);
    this.cancelWarmUp = whenIdle(() => assembly.warmUp?.((object) => this.compileHidden(object)));
  }

  private compileHidden(object: Object3D): void {
    const { viewport, rig, scene } = this.dependencies;
    const shown = object.visible;
    object.visible = true;
    void viewport.renderer.compileAsync(object, rig.camera, scene);
    object.visible = shown;
  }

  setState(state: AssemblyState): void {
    this.assembly?.setState(state);
  }

  update(deltaSeconds: number): boolean {
    const { camera, controls } = this.dependencies.rig;
    return (
      this.assembly?.update(deltaSeconds, camera.position.distanceTo(controls.target)) ?? false
    );
  }

  dispose(): void {
    this.cancelWarmUp();
    this.assembly?.root.removeFromParent();
    this.assembly?.dispose();
    this.assembly = null;
  }
}
