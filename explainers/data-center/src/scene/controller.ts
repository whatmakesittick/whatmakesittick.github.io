import type { Box3, Object3D } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import { regionFromSpec } from '@core/scene/regions';
import type { SceneShell } from '@core/scene/shell';
import { whenIdle } from '@core/scene/warmUp';
import type { AnchorId, AssemblyState, CameraView, RegionId } from '../ids';
import { GROUND_Y } from '../model';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { cameraViews } from './cameraViews';
import { VIEW_REGION_SPECS, isAssemblyRegion } from './regions';
import type { FramedRegionId } from './regions';

export type DataCenterControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig' | 'viewport'
>;

export type ViewFramer = Pick<CameraViews<CameraView>, 'frame'>;

export const BOUNDS_REGION: RegionId = 'campus';
export const FOLLOW_ANCHOR: AnchorId = 'joule';

export class DataCenterController {
  readonly views: ViewFramer;
  private readonly dependencies: DataCenterControllerDependencies;
  private assembly: Assembly | null = null;
  private cancelWarmUp: () => void = () => {};

  constructor(dependencies: DataCenterControllerDependencies) {
    this.dependencies = dependencies;
    this.views = new CameraViews<CameraView, FramedRegionId>(dependencies.rig, {
      views: cameraViews(() => this.assembly?.chaseTarget() ?? null),
      region: (id) => this.region(id),
      anchor: () => this.assembly?.anchor(FOLLOW_ANCHOR) ?? null,
    });
  }

  build(state: AssemblyState): void {
    const { scene, materials, textures, labels, rig } = this.dependencies;
    this.dispose();
    const assembly = createAssembly({ materials, textures }, state);
    this.assembly = assembly;
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    rig.setBounds(assembly.region(BOUNDS_REGION), GROUND_Y);
    this.cancelWarmUp = whenIdle(() => assembly.warmUp?.((object) => this.compileHidden(object)));
  }

  setState(state: AssemblyState): void {
    this.assembly?.setState(state);
  }

  update(deltaSeconds: number): boolean {
    return this.assembly?.update(deltaSeconds, this.cameraDistance()) ?? false;
  }

  dispose(): void {
    this.cancelWarmUp();
    this.assembly?.root.removeFromParent();
    this.assembly?.dispose();
    this.assembly = null;
  }

  private region(id: FramedRegionId): Box3 | null {
    if (!this.assembly) return null;
    return isAssemblyRegion(id) ? this.assembly.region(id) : regionFromSpec(VIEW_REGION_SPECS[id]);
  }

  private cameraDistance(): number {
    const { camera, controls } = this.dependencies.rig;
    return camera.position.distanceTo(controls.target);
  }

  private compileHidden(object: Object3D): void {
    const { viewport, rig, scene } = this.dependencies;
    const shown = object.visible;
    object.visible = true;
    void viewport.renderer.compileAsync(object, rig.camera, scene);
    object.visible = shown;
  }
}
