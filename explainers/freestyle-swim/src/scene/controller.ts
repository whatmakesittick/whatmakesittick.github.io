import { Box3 } from 'three';
import type { Object3D } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import { runPaced } from '@core/scene/pacing';
import type { SceneShell } from '@core/scene/shell';
import { whenIdle } from '@core/scene/warmUp';
import type { AssemblyState, CameraView, RegionId } from '../ids';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { BOUNDS_REGIONS, CAMERA_VIEWS } from './cameraViews';
import { FLOOR_HEIGHT_M } from './constants';

export type SwimControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig' | 'viewport'
>;

export type ViewFramer = Pick<CameraViews<CameraView>, 'frame'>;

export class SwimController {
  readonly views: ViewFramer;
  private readonly dependencies: SwimControllerDependencies;
  private readonly cameraViews: CameraViews<CameraView, RegionId>;
  private assembly: Assembly | null = null;
  private cancelWarmUp: () => void = () => {};
  private generation = 0;

  constructor(dependencies: SwimControllerDependencies) {
    this.dependencies = dependencies;
    this.cameraViews = new CameraViews<CameraView, RegionId>(dependencies.rig, {
      views: CAMERA_VIEWS,
      region: (id) => this.assembly?.region(id) ?? null,
    });
    this.views = { frame: (view, animate) => this.cameraViews.frame(view, animate) };
  }

  async build(state: AssemblyState): Promise<void> {
    const { scene, materials, textures, labels } = this.dependencies;
    this.dispose();
    const generation = this.generation;
    const assembly = await runPaced(createAssembly({ materials, textures }, state));
    if (generation !== this.generation) {
      assembly.dispose();
      return;
    }
    this.assembly = assembly;
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    this.bound(assembly);
    this.cancelWarmUp = whenIdle(() => assembly.warmUp?.((object) => this.compileHidden(object)));
  }

  setState(state: AssemblyState): void {
    this.assembly?.setState(state);
  }

  update(deltaSeconds: number): boolean {
    const { rig } = this.dependencies;
    const cameraDistance = rig.camera.position.distanceTo(rig.controls.target);
    return this.assembly?.update(deltaSeconds, cameraDistance) ?? false;
  }

  dispose(): void {
    this.generation += 1;
    this.cancelWarmUp();
    this.assembly?.root.removeFromParent();
    this.assembly?.dispose();
    this.assembly = null;
  }

  private bound(assembly: Assembly): void {
    const bounds = BOUNDS_REGIONS.reduce((box, id) => box.union(assembly.region(id)), new Box3());
    this.dependencies.rig.setBounds(bounds, FLOOR_HEIGHT_M);
  }

  private compileHidden(object: Object3D): void {
    const { viewport, rig, scene } = this.dependencies;
    const shown = object.visible;
    object.visible = true;
    void viewport.renderer.compileAsync(object, rig.camera, scene);
    object.visible = shown;
  }
}
