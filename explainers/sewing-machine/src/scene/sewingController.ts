import type { Object3D } from 'three';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import type { SceneShell } from '@core/scene/shell';
import type { CameraView, SewingState, ViewOptions } from '../state';
import { poseForView } from './cameraViews';
import { SewingAssembly } from './sewingAssembly';

export type SewingControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'labels' | 'stage' | 'rig'
>;

export class SewingController {
  private readonly dependencies: SewingControllerDependencies;
  private assembly: SewingAssembly | null = null;

  constructor(dependencies: SewingControllerDependencies) {
    this.dependencies = dependencies;
  }

  build(state: SewingState): void {
    const { scene, materials, labels, stage, rig } = this.dependencies;
    this.assembly?.dispose();
    const assembly = new SewingAssembly(materials);
    this.assembly = assembly;
    assembly.setView(state.view);
    this.update(state);
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    stage.fit(assembly.region('all'), assembly.floorHeight());
    rig.setBounds(assembly.region('reach'), assembly.floorHeight());
  }

  applyView(view: ViewOptions): void {
    this.assembly?.setView(view);
  }

  update(state: SewingState): void {
    this.assembly?.update({
      angle: state.phase,
      stitchLength: state.stitchLength,
      tension: state.tension,
    });
  }

  labelAnchors(): ReadonlyMap<string, Object3D> {
    return this.assembly?.labelAnchors() ?? new Map();
  }

  pose(view: CameraView, slopes: FramingSlopes): CameraPose | null {
    const assembly = this.assembly;
    if (!assembly) return null;
    return poseForView(view, (id) => assembly.region(id), slopes);
  }

  dispose(): void {
    this.assembly?.dispose();
    this.assembly = null;
  }
}
