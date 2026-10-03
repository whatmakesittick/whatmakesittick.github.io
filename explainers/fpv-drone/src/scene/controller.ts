import { Vector3 } from 'three';
import type { Object3D } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import { whenIdle } from '@core/scene/warmUp';
import type { AssemblyState, CameraView, RegionId } from '../ids';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { cameraViews } from './cameraViews';
import { GOGGLES_EYE_REACH } from './constants';

export type FpvControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig' | 'viewport'
>;

export class FpvController {
  readonly views: CameraViews<CameraView, RegionId>;
  private readonly dependencies: FpvControllerDependencies;
  private assembly: Assembly | null = null;
  private cancelWarmUp: () => void = () => {};
  private readonly eye = new Vector3();

  constructor(dependencies: FpvControllerDependencies) {
    this.dependencies = dependencies;
    this.views = new CameraViews(dependencies.rig, {
      views: cameraViews(() => this.assembly?.chaseTarget() ?? null),
      region: (id) => this.assembly?.region(id) ?? null,
      anchor: () => this.assembly?.anchor('drone') ?? null,
    });
  }

  build(state: AssemblyState): void {
    const { scene, materials, textures, labels, rig } = this.dependencies;
    this.dispose();
    const assembly = createAssembly({ materials, textures }, state);
    this.assembly = assembly;
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    const bounds = assembly.region('scene');
    rig.setBounds(bounds, bounds.min.y);
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

  ridesTheCamera(): boolean {
    const eye = this.assembly?.anchor('camera');
    if (!eye) return false;
    const reach = eye.getWorldPosition(this.eye).distanceTo(this.dependencies.rig.camera.position);
    return reach <= GOGGLES_EYE_REACH;
  }

  dispose(): void {
    this.cancelWarmUp();
    this.assembly?.root.removeFromParent();
    this.assembly?.dispose();
    this.assembly = null;
  }
}
