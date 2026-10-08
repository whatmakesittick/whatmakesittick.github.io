import type { Object3D } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import { whenIdle } from '@core/scene/warmUp';
import type { AssemblyState, CameraView, RegionId, SceneId } from '../ids';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { CAMERA_VIEWS, FOLLOWED_ANCHOR, stageVariant } from './cameraViews';
import type { StageVariant } from './cameraViews';

export type WindFarmControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig' | 'viewport'
>;

export type ViewFramer = Pick<CameraViews<CameraView>, 'frame'>;

const SCENE_BOUNDS: Readonly<Record<SceneId, RegionId>> = { farm: 'farm', turbine: 'turbine' };

export class WindFarmController {
  readonly views: ViewFramer;
  private readonly dependencies: WindFarmControllerDependencies;
  private readonly cameraViews: CameraViews<CameraView, RegionId>;
  private assembly: Assembly | null = null;
  private boundScene: SceneId | null = null;
  private cancelWarmUp: () => void = () => {};

  constructor(dependencies: WindFarmControllerDependencies) {
    this.dependencies = dependencies;
    this.cameraViews = new CameraViews(dependencies.rig, {
      views: CAMERA_VIEWS,
      region: (id) => this.assembly?.region(id) ?? null,
      anchor: () => this.assembly?.anchor(FOLLOWED_ANCHOR) ?? null,
    });
    this.views = {
      frame: (view, animate, variant) =>
        this.cameraViews.frame(view, animate, variant ?? this.stageVariant()),
    };
  }

  build(state: AssemblyState): void {
    const { scene, materials, textures, labels } = this.dependencies;
    this.dispose();
    const assembly = createAssembly({ materials, textures }, state);
    this.assembly = assembly;
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    this.boundTo(state.scene);
    this.cancelWarmUp = whenIdle(() => assembly.warmUp?.((object) => this.compileHidden(object)));
  }

  setState(state: AssemblyState): void {
    this.assembly?.setState(state);
    this.boundTo(state.scene);
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
    this.boundScene = null;
  }

  private boundTo(scene: SceneId): void {
    if (!this.assembly || scene === this.boundScene) return;
    const bounds = this.assembly.region(SCENE_BOUNDS[scene]);
    this.dependencies.rig.setBounds(bounds, bounds.min.y);
    this.boundScene = scene;
  }

  private stageVariant(): StageVariant {
    return stageVariant(this.dependencies.viewport.element.clientWidth);
  }

  private compileHidden(object: Object3D): void {
    const { viewport, rig, scene } = this.dependencies;
    const shown = object.visible;
    object.visible = true;
    void viewport.renderer.compileAsync(object, rig.camera, scene);
    object.visible = shown;
  }
}
