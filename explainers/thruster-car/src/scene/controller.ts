import type { Object3D } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import { whenIdle } from '@core/scene/warmUp';
import type { AnchorId, AssemblyState, CameraView, RegionId } from '../ids';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { cameraViews } from './cameraViews';
import { ViewHandover } from './viewHandover';
import type { ViewFramer } from './viewHandover';

export type ThrusterCarControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig' | 'viewport'
>;

export const BOUNDS_REGION: RegionId = 'site';
export const FOLLOW_ANCHOR: AnchorId = 'car';
export const FLOOR_Y = 0;

export class ThrusterCarController {
  readonly views: ViewFramer;
  private readonly handover: ViewHandover;
  private readonly dependencies: ThrusterCarControllerDependencies;
  private assembly: Assembly | null = null;
  private cancelWarmUp: () => void = () => {};

  constructor(dependencies: ThrusterCarControllerDependencies) {
    this.dependencies = dependencies;
    this.handover = new ViewHandover(
      new CameraViews<CameraView, RegionId>(dependencies.rig, {
        views: cameraViews(() => this.assembly?.chaseTarget() ?? null),
        region: (id) => this.assembly?.region(id) ?? null,
        anchor: () => this.assembly?.anchor(FOLLOW_ANCHOR) ?? null,
      }),
    );
    this.views = this.handover;
  }

  build(state: AssemblyState): void {
    const { scene, materials, textures, labels, rig } = this.dependencies;
    this.dispose();
    const assembly = createAssembly({ materials, textures }, state);
    this.assembly = assembly;
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    rig.setBounds(assembly.region(BOUNDS_REGION), FLOOR_Y);
    this.cancelWarmUp = whenIdle(() => assembly.warmUp?.((object) => this.compileHidden(object)));
  }

  setState(state: AssemblyState): void {
    this.assembly?.setState(state);
    this.handover.setPhase(state.phase);
  }

  update(deltaSeconds: number): boolean {
    const { camera, controls } = this.dependencies.rig;
    const cameraDistance = camera.position.distanceTo(controls.target);
    return this.assembly?.update(deltaSeconds, cameraDistance) ?? false;
  }

  dispose(): void {
    this.cancelWarmUp();
    this.assembly?.root.removeFromParent();
    this.assembly?.dispose();
    this.assembly = null;
  }

  private compileHidden(object: Object3D): void {
    const { viewport, rig, scene } = this.dependencies;
    const shown = object.visible;
    object.visible = true;
    void viewport.renderer.compileAsync(object, rig.camera, scene);
    object.visible = shown;
  }
}
