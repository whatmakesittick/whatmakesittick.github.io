import { Vector3 } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import type { AssemblyState, RegionId } from '../ids';
import type { CameraView } from '../state';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { cameraViews } from './cameraViews';
import type { AnchorPositions } from './cameraViews';

export type BlackHoleControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig' | 'viewport' | 'invalidate'
>;

const NO_FLOOR = Number.NEGATIVE_INFINITY;

export class BlackHoleController {
  readonly views: CameraViews<CameraView, RegionId>;
  private readonly dependencies: BlackHoleControllerDependencies;
  private assembly: Assembly | null = null;

  constructor(dependencies: BlackHoleControllerDependencies) {
    this.dependencies = dependencies;
    this.views = new CameraViews(dependencies.rig, {
      views: cameraViews(() => this.anchorPositions()),
      region: (id) => this.assembly?.region(id) ?? null,
      anchor: () => this.assembly?.anchor('probe') ?? null,
    });
  }

  build(state: AssemblyState): void {
    const { scene, materials, textures, labels, rig, viewport, invalidate } = this.dependencies;
    this.dispose();
    const assembly = createAssembly({ materials, textures, renderer: viewport.renderer }, state);
    this.assembly = assembly;
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    rig.setBounds(assembly.region('scene'), NO_FLOOR);
    void assembly.prepare().then(() => {
      if (this.assembly === assembly) invalidate();
    });
  }

  setState(state: AssemblyState): void {
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

  private anchorPositions(): AnchorPositions | null {
    if (!this.assembly) return null;
    return {
      probe: this.assembly.anchor('probe').getWorldPosition(new Vector3()),
      ship: this.assembly.anchor('ship').getWorldPosition(new Vector3()),
    };
  }
}
