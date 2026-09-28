import type { Object3D } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import type { AssemblyState, RegionId, ValveId } from '../ids';
import { DEFAULT_VALVE } from '../state';
import type { CameraView } from '../state';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { cameraViews } from './cameraViews';

export type HeartControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'stage' | 'rig'
>;

export class HeartController {
  readonly views: CameraViews<CameraView, RegionId>;
  private readonly dependencies: HeartControllerDependencies;
  private assembly: Assembly | null = null;
  private valve: ValveId = DEFAULT_VALVE;

  constructor(dependencies: HeartControllerDependencies) {
    this.dependencies = dependencies;
    const valveAnchor = () => this.valveAnchor();
    this.views = new CameraViews(dependencies.rig, {
      views: cameraViews(valveAnchor),
      region: (id) => this.assembly?.region(id) ?? null,
      anchor: valveAnchor,
    });
  }

  build(state: AssemblyState): void {
    const { scene, materials, textures, labels, stage, rig } = this.dependencies;
    this.dispose();
    const assembly = createAssembly({ materials, textures }, state);
    this.assembly = assembly;
    this.valve = state.valve;
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    const bounds = assembly.region('scene');
    rig.setBounds(bounds, bounds.min.y);
    stage.fit(bounds, bounds.min.y);
  }

  setState(state: AssemblyState): void {
    this.valve = state.valve;
    this.assembly?.setState(state);
  }

  update(deltaSeconds: number): boolean {
    const { camera, controls } = this.dependencies.rig;
    return (
      this.assembly?.update(deltaSeconds, camera.position.distanceTo(controls.target)) ?? false
    );
  }

  dispose(): void {
    this.assembly?.root.removeFromParent();
    this.assembly?.dispose();
    this.assembly = null;
  }

  private valveAnchor(): Object3D | null {
    return this.assembly?.anchor(this.valve) ?? null;
  }
}
