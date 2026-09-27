import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import { FLIGHT_CYCLE } from '../model';
import type { GliderType } from '../model';
import type { CameraView, GliderState, ViewOptions } from '../state';
import { cameraViews } from './cameraViews';
import { FLOOR_HEIGHT } from './constants';
import { Diorama } from './diorama';
import type { RegionId } from './regions';

export type GliderControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'rig'
>;

function shortestStep(from: number, to: number): number {
  const step = to - from;
  return step - FLIGHT_CYCLE * Math.round(step / FLIGHT_CYCLE);
}

export class GliderController {
  readonly views: CameraViews<CameraView, RegionId>;
  private readonly dependencies: GliderControllerDependencies;
  private diorama: Diorama | null = null;
  private lastPhase = 0;

  constructor(dependencies: GliderControllerDependencies) {
    this.dependencies = dependencies;
    this.views = new CameraViews(dependencies.rig, {
      views: cameraViews(() => this.diorama?.chaseTarget() ?? null),
      region: (id) => this.diorama?.region(id) ?? null,
      anchor: () => this.diorama?.gliderAnchor ?? null,
    });
  }

  build(state: GliderState): void {
    const { scene, materials, textures, labels, rig } = this.dependencies;
    this.diorama?.dispose();
    const diorama = new Diorama({ materials, textures }, state.glider);
    this.diorama = diorama;
    diorama.setView(state.view);
    this.lastPhase = state.phase;
    this.update(state);
    scene.add(diorama.root);
    labels.attach(diorama.labelAnchors());
    rig.setBounds(diorama.region('overview'), FLOOR_HEIGHT);
  }

  applyView(view: ViewOptions): void {
    this.diorama?.setView(view);
  }

  setGlider(type: GliderType): void {
    this.diorama?.setGlider(type);
  }

  update(state: GliderState): void {
    const flightSeconds = shortestStep(this.lastPhase, state.phase);
    this.lastPhase = state.phase;
    this.diorama?.update({ phase: state.phase, flightSeconds });
    const { rig } = this.dependencies;
    this.diorama?.keepGliderVisibleFrom(rig.camera.position, rig.framing());
  }

  dispose(): void {
    this.diorama?.dispose();
    this.diorama = null;
  }
}
