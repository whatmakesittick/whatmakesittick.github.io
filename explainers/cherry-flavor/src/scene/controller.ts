import { Box3 } from 'three';
import type { Object3D } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import { whenIdle } from '@core/scene/warmUp';
import { SCALE_IDS } from '../ids';
import type { AssemblyState, CameraView, RegionId, ScaleId } from '../ids';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { BOUNDS_REGIONS, CAMERA_VIEWS, cameraFor } from './cameraViews';

export type FlavorControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig' | 'viewport'
>;

export type ViewFramer = Pick<CameraViews<CameraView>, 'frame'>;

function isScale(value: string | undefined): value is ScaleId {
  return SCALE_IDS.some((scale) => scale === value);
}

export class FlavorController {
  readonly views: ViewFramer;
  private readonly dependencies: FlavorControllerDependencies;
  private readonly cameraViews: CameraViews<CameraView, RegionId>;
  private assembly: Assembly | null = null;
  private scale: ScaleId | null = null;
  private cancelWarmUp: () => void = () => {};

  constructor(dependencies: FlavorControllerDependencies) {
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
    const assembly = this.assembly;
    if (!assembly || scale === this.scale) return;
    const bounds = BOUNDS_REGIONS[scale].reduce(
      (box, id) => box.union(assembly.region(id)),
      new Box3(),
    );
    this.dependencies.rig.setBounds(bounds, bounds.min.y);
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
