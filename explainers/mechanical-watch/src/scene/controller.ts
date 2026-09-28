import type { Object3D } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import type { AnchorId, AssemblyState, RegionId, WheelId } from '../ids';
import { DEFAULT_WHEEL } from '../state';
import type { CameraView } from '../state';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { cameraViews } from './cameraViews';

export type WatchControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'stage' | 'rig'
>;

export class WatchController {
  readonly views: CameraViews<CameraView, RegionId>;
  private readonly dependencies: WatchControllerDependencies;
  private assembly: Assembly | null = null;
  private followedWheel: WheelId = DEFAULT_WHEEL;

  constructor(dependencies: WatchControllerDependencies) {
    this.dependencies = dependencies;
    this.views = new CameraViews(dependencies.rig, {
      views: cameraViews({
        wheel: () => this.wheelAnchor(),
        fork: () => this.anchor('fork'),
      }),
      region: (id) => this.assembly?.region(id) ?? null,
      anchor: () => this.wheelAnchor(),
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
  }

  setState(state: AssemblyState): void {
    this.assembly?.setState(state);
  }

  followWheel(wheel: WheelId): void {
    this.followedWheel = wheel;
  }

  update(deltaSeconds: number): void {
    const { camera, controls } = this.dependencies.rig;
    this.assembly?.update(deltaSeconds, camera.position.distanceTo(controls.target));
  }

  dispose(): void {
    this.assembly?.root.removeFromParent();
    this.assembly?.dispose();
    this.assembly = null;
  }

  private wheelAnchor(): Object3D | null {
    return this.anchor(this.followedWheel);
  }

  private anchor(id: AnchorId): Object3D | null {
    return this.assembly?.anchor(id) ?? null;
  }
}
