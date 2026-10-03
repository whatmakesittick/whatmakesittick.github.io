import type { Object3D } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import { whenIdle } from '@core/scene/warmUp';
import type { AssemblyState, CameraView, RegionId } from '../ids';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { VIEW_DISTANCE, cameraViews } from './cameraViews';
import type { FollowTarget } from './cameraViews';
import { lookUpLimits } from './viewFit';

export type NavalDroneControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig' | 'viewport'
>;

export type ViewFramer = Pick<CameraViews<CameraView>, 'frame'>;

const SEA_CLEARANCE_M = 1;

export class NavalDroneController {
  readonly views: ViewFramer;
  private readonly dependencies: NavalDroneControllerDependencies;
  private readonly cameraViews: CameraViews<CameraView, RegionId>;
  private readonly defaultMaxPolar: number;
  private assembly: Assembly | null = null;
  private state: AssemblyState | null = null;
  private cancelWarmUp: () => void = () => {};

  constructor(dependencies: NavalDroneControllerDependencies) {
    this.dependencies = dependencies;
    this.defaultMaxPolar = dependencies.rig.controls.maxPolarAngle;
    this.cameraViews = new CameraViews(dependencies.rig, {
      views: cameraViews(() => this.followTarget()),
      region: (id) => this.assembly?.region(id) ?? null,
      anchor: () => this.assembly?.anchor('boat') ?? null,
    });
    this.views = { frame: (view, animate, variant) => this.frame(view, animate, variant) };
  }

  build(state: AssemblyState): void {
    const { scene, materials, textures, labels, rig } = this.dependencies;
    this.dispose();
    const assembly = createAssembly({ materials, textures }, state);
    this.assembly = assembly;
    this.state = state;
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    const bounds = assembly.region('scene');
    rig.setBounds(bounds, bounds.min.y);
    this.cancelWarmUp = whenIdle(() => assembly.warmUp?.((object) => this.compileHidden(object)));
  }

  setState(state: AssemblyState): void {
    this.state = state;
    this.assembly?.setState(state);
  }

  update(deltaSeconds: number): boolean {
    const { camera, controls } = this.dependencies.rig;
    return (
      this.assembly?.update(deltaSeconds, camera.position.distanceTo(controls.target)) ?? false
    );
  }

  dispose(): void {
    this.cancelWarmUp();
    this.assembly?.root.removeFromParent();
    this.assembly?.dispose();
    this.assembly = null;
  }

  private followTarget(): FollowTarget | null {
    const chase = this.assembly?.chaseTarget();
    if (!chase || !this.state) return null;
    return { ...chase, trim: this.state.planing.trim };
  }

  private frame(view: CameraView, animate: boolean, variant?: string): void {
    this.cameraViews.frame(view, animate, variant);
    this.limitLookUp(view);
  }

  private limitLookUp(view: CameraView): void {
    const { rig } = this.dependencies;
    const pose = this.cameraViews.pose(view);
    if (!pose) return;
    const limits = lookUpLimits(pose, this.defaultMaxPolar, SEA_CLEARANCE_M);
    rig.controls.maxPolarAngle = limits.maxPolarAngle;
    if (limits.maxDistance !== null) {
      rig.setDistanceLimits({ ...VIEW_DISTANCE[view], max: limits.maxDistance });
    }
  }

  private compileHidden(object: Object3D): void {
    const { viewport, rig, scene } = this.dependencies;
    const shown = object.visible;
    object.visible = true;
    void viewport.renderer.compileAsync(object, rig.camera, scene);
    object.visible = shown;
  }
}
