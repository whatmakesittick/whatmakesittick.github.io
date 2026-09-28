import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import type { CameraView, MicroscopeState, ViewOptions } from '../state';
import { VIEWS } from './cameraViews';
import { MicroscopeAssembly } from './microscopeAssembly';
import type { Optics } from './microscopeAssembly';
import type { RegionId } from './regions';

export type MicroscopeControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'stage' | 'rig'
>;

export class MicroscopeController {
  readonly views: CameraViews<CameraView, RegionId>;
  private readonly dependencies: MicroscopeControllerDependencies;
  private assembly: MicroscopeAssembly | null = null;

  constructor(dependencies: MicroscopeControllerDependencies) {
    this.dependencies = dependencies;
    this.views = new CameraViews(dependencies.rig, {
      views: VIEWS,
      region: (id) => this.assembly?.region(id) ?? null,
    });
  }

  build(state: MicroscopeState): void {
    const { scene, materials, textures, labels, stage, rig } = this.dependencies;
    this.assembly?.dispose();
    const assembly = new MicroscopeAssembly({ materials, textures }, state);
    this.assembly = assembly;
    assembly.setView(state.view);
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    const bounds = assembly.region('instrument');
    stage.fit(bounds, assembly.floorHeight());
    rig.setBounds(bounds, assembly.floorHeight());
  }

  applyView(view: ViewOptions): void {
    this.assembly?.setView(view);
  }

  setOptics(optics: Optics): void {
    this.assembly?.setOptics(optics);
  }

  setWavelength(wavelength: number): void {
    this.assembly?.setWavelength(wavelength);
  }

  update(state: MicroscopeState, deltaSeconds: number): void {
    const { camera, controls } = this.dependencies.rig;
    this.assembly?.update(state.phase, deltaSeconds, camera.position.distanceTo(controls.target));
  }

  dispose(): void {
    this.assembly?.dispose();
    this.assembly = null;
  }
}
