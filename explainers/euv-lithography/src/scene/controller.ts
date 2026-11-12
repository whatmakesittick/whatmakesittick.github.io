import type { Object3D } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import { whenIdle } from '@core/scene/warmUp';
import type { AnchorId, AssemblyState, CameraView, RegionId } from '../ids';
import { FLOOR_Y } from '../model';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { cameraViews } from './cameraViews';

export type EuvControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig' | 'viewport'
>;

export type ViewFramer = Pick<CameraViews<CameraView>, 'frame'>;

export const BOUNDS_REGION: RegionId = 'machine';
export const FOLLOW_ANCHOR: AnchorId = 'flash';

export class EuvController {
  readonly views: ViewFramer;
  private readonly dependencies: EuvControllerDependencies;
  private assembly: Assembly | null = null;
  private cancelWarmUp: () => void = () => {};

  constructor(dependencies: EuvControllerDependencies) {
    this.dependencies = dependencies;
    this.views = new CameraViews<CameraView, RegionId>(dependencies.rig, {
      views: cameraViews(() => this.assembly?.chaseTarget() ?? null),
      region: (id) => this.assembly?.region(id) ?? null,
      anchor: () => this.assembly?.anchor(FOLLOW_ANCHOR) ?? null,
    });
  }

  async build(state: AssemblyState): Promise<void> {
    const { scene, materials, textures, labels, rig } = this.dependencies;
    this.dispose();
    const assembly = await createAssembly({ materials, textures }, state);
    this.assembly = assembly;
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    rig.setBounds(assembly.region(BOUNDS_REGION), FLOOR_Y);
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
