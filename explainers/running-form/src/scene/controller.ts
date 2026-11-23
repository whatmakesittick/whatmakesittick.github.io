import { Box3 } from 'three';
import type { Object3D } from 'three';
import { CameraViews } from '@core/scene/cameraViews';
import { runPaced } from '@core/scene/pacing';
import type { SceneShell } from '@core/scene/shell';
import { whenIdle } from '@core/scene/warmUp';
import type { AssemblyState, CameraView, RegionId } from '../ids';
import { RoadScroll } from './roadScroll';
import { createAssembly } from './assembly';
import type { Assembly, AssemblyResources } from './assembly';
import { BOUNDS_REGIONS, CAMERA_VIEWS } from './cameraViews';

const FLOOR_HEIGHT_M = 0.02;

export type RunControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig' | 'viewport'
>;

export type ViewFramer = Pick<CameraViews<CameraView, RegionId>, 'frame'>;

async function loadFigureResources(): Promise<Partial<AssemblyResources>> {
  return {};
}

export class RunController {
  readonly views: ViewFramer;
  private readonly dependencies: RunControllerDependencies;
  private readonly cameraViews: CameraViews<CameraView, RegionId>;
  private readonly roadScroll = new RoadScroll();
  private assembly: Assembly | null = null;
  private followsPelvis = true;
  private cancelWarmUp: () => void = () => {};
  private generation = 0;

  constructor(dependencies: RunControllerDependencies) {
    this.dependencies = dependencies;
    this.cameraViews = new CameraViews<CameraView, RegionId>(dependencies.rig, {
      views: CAMERA_VIEWS,
      region: (id) => this.assembly?.region(id) ?? null,
      anchor: () => this.followedAnchor(),
    });
    this.views = { frame: (view, animate) => this.cameraViews.frame(view, animate) };
  }

  async build(state: AssemblyState): Promise<void> {
    const { scene, materials, textures, labels } = this.dependencies;
    this.dispose();
    const generation = this.generation;
    const figureResources = await loadFigureResources();
    if (generation !== this.generation) return;
    this.roadScroll.reset(state.phase);
    state.scrollM = 0;
    this.followsPelvis = state.view.follow;
    const assembly = await runPaced(
      createAssembly({ materials, textures, ...figureResources }, state),
    );
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
    state.scrollM = this.roadScroll.update(state.phase, state.reading.timing.strideLengthM);
    this.followPelvis(state.view.follow);
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

  private followedAnchor(): Object3D | null {
    return this.assembly?.anchor(this.followsPelvis ? 'pelvis' : 'runner') ?? null;
  }

  private followPelvis(follows: boolean): void {
    if (follows === this.followsPelvis) return;
    this.followsPelvis = follows;
    this.dependencies.rig.follow(this.followedAnchor(), 'position');
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
