import { CameraViews } from '@core/scene/cameraViews';
import type { SceneShell } from '@core/scene/shell';
import { FORWARD_SHARE } from '../model';
import type { CameraView, HelicopterState, ViewOptions } from '../state';
import { VIEWS } from './cameraViews';
import { SETTLED_SHARE, SETTLE_RATE } from './constants';
import { HelicopterAssembly } from './helicopterAssembly';
import type { RegionId } from './regions';

export type HelicopterControllerDependencies = Pick<
  SceneShell,
  'scene' | 'materials' | 'textures' | 'labels' | 'stage' | 'rig'
>;

interface Settled {
  collective: number;
  forward: number;
}

function approach(current: number, target: number, blend: number): number {
  const next = current + (target - current) * blend;
  return Math.abs(target - next) < SETTLED_SHARE ? target : next;
}

export class HelicopterController {
  readonly views: CameraViews<CameraView, RegionId>;
  private readonly dependencies: HelicopterControllerDependencies;
  private assembly: HelicopterAssembly | null = null;
  private settled: Settled = { collective: 0, forward: 0 };

  constructor(dependencies: HelicopterControllerDependencies) {
    this.dependencies = dependencies;
    this.views = new CameraViews(dependencies.rig, {
      views: VIEWS,
      region: (id) => this.assembly?.region(id) ?? null,
    });
  }

  build(state: HelicopterState): void {
    const { scene, materials, textures, labels, stage, rig } = this.dependencies;
    this.assembly?.dispose();
    const assembly = new HelicopterAssembly({ materials, textures });
    this.assembly = assembly;
    this.settled = { collective: state.collective, forward: FORWARD_SHARE[state.flightMode] };
    assembly.setFlowVisible(state.view.flow);
    this.update(state, 0);
    scene.add(assembly.root);
    labels.attach(assembly.labelAnchors());
    const bounds = assembly.region('all');
    stage.fit(bounds, assembly.floorHeight());
    rig.setBounds(bounds, assembly.floorHeight());
  }

  applyView(view: ViewOptions): void {
    this.assembly?.setFlowVisible(view.flow);
  }

  update(state: HelicopterState, deltaSeconds: number): boolean {
    if (!this.assembly) return false;
    const blend = 1 - Math.exp(-SETTLE_RATE * deltaSeconds);
    const target: Settled = {
      collective: state.collective,
      forward: FORWARD_SHARE[state.flightMode],
    };
    this.settled = {
      collective: approach(this.settled.collective, target.collective, blend),
      forward: approach(this.settled.forward, target.forward, blend),
    };
    const flowing = this.assembly.update({
      azimuth: state.phase,
      rpm: state.speed,
      deltaSeconds,
      ...this.settled,
    });
    const settling =
      this.settled.collective !== target.collective || this.settled.forward !== target.forward;
    return flowing || settling;
  }

  dispose(): void {
    this.assembly?.dispose();
    this.assembly = null;
  }
}
