import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import type { AssemblyState, RegionId } from '../ids';
import type { CameraView } from '../state';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { CAMERA_VIEWS } from './cameraViews';

export type AtpSynthaseControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig'
>;

export class AtpSynthaseController {
  readonly views: CameraViews<CameraView, RegionId>;
  private readonly dependencies: AtpSynthaseControllerDependencies;
  private assembly: Assembly | null = null;

  constructor(dependencies: AtpSynthaseControllerDependencies) {
    this.dependencies = dependencies;
    this.views = new CameraViews(dependencies.rig, {
      views: CAMERA_VIEWS,
      region: (id) => this.assembly?.region(id) ?? null,
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
  }

  setState(state: AssemblyState): void {
    this.assembly?.setState(state);
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
}
