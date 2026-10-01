import { Group } from 'three';
import type { Box3, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { regionFromSpec } from '@core/scene/regions';
import { ResourceTracker } from '@core/scene/resources';
import { toRadians } from '@core/math';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import type { Assembly, AssemblyResources } from './assembly';
import { WOOD_GRAIN } from './constants';
import { createLooks } from './finishes';
import { woodGrain } from './geometry/woodGrain';
import { addBarrel } from './parts/barrel';
import { batchStatic } from './parts/batch';
import { CutawaySwitch, markDynamic } from './parts/context';
import type { PartContext } from './parts/context';
import { createChargingHandle, createSelector, createTrigger } from './parts/controls';
import { addFurniture } from './parts/furniture';
import { addGasSystem } from './parts/gasSystem';
import { LabelAnchors } from './parts/labels';
import { addMagazine } from './parts/magazine';
import { addReceiver } from './parts/receiver';
import { addSights } from './parts/sights';
import { REGIONS } from './regions';

export class RifleAssembly implements Assembly {
  readonly root = new Group();
  private readonly body = new Group();
  private readonly carrier = new Group();
  private readonly trigger: Group;
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly cutaway = new CutawaySwitch();
  private readonly labels: LabelAnchors;
  private shownCut: boolean | null = null;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    const looks = createLooks({
      stock: this.tracker.track(woodGrain(WOOD_GRAIN.stock)),
      handguard: this.tracker.track(woodGrain(WOOD_GRAIN.handguard)),
    });
    const context: PartContext = {
      ...resources,
      tracker: this.tracker,
      cutaway: this.cutaway,
      looks,
    };
    addBarrel(context, this.body);
    addGasSystem(context, this.body);
    addSights(context, this.body);
    addFurniture(context, this.body);
    addReceiver(context, this.body);
    addMagazine(context, this.body);
    this.body.add(createSelector(context));
    this.trigger = markDynamic(createTrigger(context));
    this.carrier.add(createChargingHandle(context));
    this.body.add(this.trigger, markDynamic(this.carrier));
    batchStatic(this.body, this.cutaway).forEach((geometry) => this.tracker.track(geometry));
    this.root.add(this.body);
    this.labels = new LabelAnchors(this.body);
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const cut = state.view.cutaway;
    if (cut !== this.shownCut) {
      this.shownCut = cut;
      this.cutaway.set(cut);
      this.labels.setCutaway(cut);
    }
    this.carrier.position.x = -state.motion.carrier;
    this.trigger.rotation.z = -toRadians(state.motion.trigger);
  }

  update(_deltaSeconds: number, _cameraDistance: number): boolean {
    return false;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels.labels;
  }

  anchor(id: AnchorId): Object3D {
    const anchor = this.labels.anchors.get(id);
    if (!anchor) throw new Error(`Unknown anchor ${id}`);
    return anchor;
  }

  region(id: RegionId): Box3 {
    this.root.updateMatrixWorld(true);
    return regionFromSpec(REGIONS[id]).applyMatrix4(this.root.matrixWorld);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.materials.clearRegistered();
    this.tracker.dispose();
  }
}

export function createRifleAssembly(resources: AssemblyResources, state: AssemblyState): Assembly {
  return new RifleAssembly(resources, state);
}
