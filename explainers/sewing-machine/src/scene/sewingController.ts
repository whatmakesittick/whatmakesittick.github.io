import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import type { CameraView, SewingState, ViewOptions } from '../state';
import { VIEWS } from './cameraViews';
import type { RegionId } from './regions';
import { SewingAssembly } from './sewingAssembly';

export type SewingControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'labels' | 'stage' | 'rig'
>;

export class SewingController {
  readonly views: CameraViews<CameraView, RegionId>;
  private readonly dependencies: SewingControllerDependencies;
  private assembly: SewingAssembly | null = null;

  constructor(dependencies: SewingControllerDependencies) {
    this.dependencies = dependencies;
    this.views = new CameraViews(dependencies.rig, {
      views: VIEWS,
      region: (id) => this.assembly?.region(id) ?? null,
    });
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
    const bounds = assembly.region('all');
    stage.fit(bounds, assembly.floorHeight());
    rig.setBounds(bounds, assembly.floorHeight());
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

  dispose(): void {
    this.assembly?.dispose();
    this.assembly = null;
  }
}
