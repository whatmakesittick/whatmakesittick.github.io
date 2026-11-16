import type { Object3D } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import { whenIdle } from '@core/scene/warmUp';
import { SCALE_IDS } from '../ids';
import type { AssemblyState, CameraView, RegionId, ScaleId } from '../ids';
import { BENCH_TOP_Y, worldRegionSpec } from '../model';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { BOUNDS_REGION, CAMERA_VIEWS, cameraFor } from './cameraViews';

export type ClockControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig' | 'viewport'
>;

export type ViewFramer = Pick<CameraViews<CameraView>, 'frame'>;

export const FLOOR_Y: Readonly<Record<ScaleId, number>> = {
  beaker: BENCH_TOP_Y,
  molecules: worldRegionSpec(BOUNDS_REGION.molecules).y[0],
};

function isScale(value: string | undefined): value is ScaleId {
  return SCALE_IDS.some((scale) => scale === value);
}

export class ClockController {
  readonly views: ViewFramer;
  private readonly dependencies: ClockControllerDependencies;
  private readonly cameraViews: CameraViews<CameraView, RegionId>;
  private assembly: Assembly | null = null;
  private scale: ScaleId | null = null;
  private cancelWarmUp: () => void = () => {};

  constructor(dependencies: ClockControllerDependencies) {
    this.dependencies = dependencies;
    this.cameraViews = new CameraViews<CameraView, RegionId>(dependencies.rig, {
      views: CAMERA_VIEWS,
      region: (id) => this.assembly?.region(id) ?? null,
    });
    this.views = {
      frame: (view, animate, variant) => {
        const scale = isScale(variant) ? variant : this.scale;
        this.cameraViews.frame(scale ? cameraFor(view, scale) : view, animate);
      },
    };
  }

  build(state: AssemblyState): void {
    const { scene, materials, textures, labels } = this.dependencies;
    this.dispose();
    const assembly = createAssembly({ materials, textures }, state);
    this.assembly = assembly;
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    this.boundTo(state.scale);
    this.cancelWarmUp = whenIdle(() => assembly.warmUp?.((object) => this.compileHidden(object)));
  }

  setState(state: AssemblyState): void {
    this.assembly?.setState(state);
    this.boundTo(state.scale);
  }

  update(deltaSeconds: number): boolean {
    const { rig } = this.dependencies;
    const cameraDistance = rig.camera.position.distanceTo(rig.controls.target);
    return this.assembly?.update(deltaSeconds, cameraDistance) ?? false;
  }

  dispose(): void {
    this.cancelWarmUp();
    this.assembly?.root.removeFromParent();
    this.assembly?.dispose();
    this.assembly = null;
    this.scale = null;
  }

  private boundTo(scale: ScaleId): void {
    if (!this.assembly || scale === this.scale) return;
    this.dependencies.rig.setBounds(this.assembly.region(BOUNDS_REGION[scale]), FLOOR_Y[scale]);
    this.scale = scale;
  }

  private compileHidden(object: Object3D): void {
    const { viewport, rig, scene } = this.dependencies;
    const shown = object.visible;
    object.visible = true;
    void viewport.renderer.compileAsync(object, rig.camera, scene);
    object.visible = shown;
  }
}
