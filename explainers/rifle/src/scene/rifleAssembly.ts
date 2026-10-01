import { Group, Mesh, Points, Sprite } from 'three';
import type { Box3, Material, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { regionFromSpec } from '@core/scene/regions';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import type { Assembly, AssemblyResources } from './assembly';
import { POWDER_GRAIN, WOOD_GRAIN } from './constants';
import { createLooks } from './finishes';
import { hammerAngle, pinPush } from './geometry/hammerClearance';
import { boltTravel } from './geometry/roundPaths';
import { powderGrain } from './geometry/powderGrain';
import { woodGrain } from './geometry/woodGrain';
import { addBarrel } from './parts/barrel';
import { batchStatic } from './parts/batch';
import { BoltPart } from './parts/bolt';
import { CarrierPart } from './parts/carrier';
import { CutawaySwitch } from './parts/context';
import type { PartContext } from './parts/context';
import { TriggerPart, addSelectorMarks, createSelector } from './parts/controls';
import { addFurniture } from './parts/furniture';
import { GasPart } from './parts/gas';
import { addGasSystem } from './parts/gasSystem';
import { HammerPart } from './parts/hammer';
import { LabelAnchors } from './parts/labels';
import { addMagazine } from './parts/magazine';
import { addReceiver } from './parts/receiver';
import { RoundsPart, addMagazineStack, createRoundGeometry } from './parts/rounds';
import { addSights } from './parts/sights';
import { SpringPart } from './parts/spring';
import { REGIONS } from './regions';

type Drawable = (Mesh | Points | Sprite) & { material: Material };

function isDrawable(object: Object3D): object is Drawable {
  const drawable = object instanceof Mesh || object instanceof Points || object instanceof Sprite;
  return drawable && !Array.isArray((object as Drawable).material);
}

function createContext(
  resources: AssemblyResources,
  tracker: ResourceTracker,
  cutaway: CutawaySwitch,
): PartContext {
  const looks = createLooks({
    stock: tracker.track(woodGrain(WOOD_GRAIN.stock)),
    handguard: tracker.track(woodGrain(WOOD_GRAIN.handguard)),
    powder: tracker.track(powderGrain(POWDER_GRAIN)),
  });
  return { ...resources, tracker, cutaway, looks };
}

export class RifleAssembly implements Assembly {
  readonly root = new Group();
  private readonly body = new Group();
  private readonly gas: GasPart;
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly cutaway = new CutawaySwitch();
  private readonly carrier: CarrierPart;
  private readonly bolt: BoltPart;
  private readonly hammer: HammerPart;
  private readonly trigger: TriggerPart;
  private readonly spring: SpringPart;
  private readonly rounds: RoundsPart;
  private readonly labels: LabelAnchors;
  private shownCut: boolean | null = null;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    const context = createContext(resources, this.tracker, this.cutaway);
    const roundGeometry = createRoundGeometry(context);
    addBarrel(context, this.body);
    addGasSystem(context, this.body);
    addSights(context, this.body);
    addFurniture(context, this.body);
    addReceiver(context, this.body);
    addMagazine(context, this.body);
    addMagazineStack(context, this.body, roundGeometry);
    this.body.add(createSelector(context));
    addSelectorMarks(context, this.body);
    this.carrier = new CarrierPart(context);
    this.bolt = new BoltPart(context);
    this.hammer = new HammerPart(context);
    this.trigger = new TriggerPart(context);
    this.spring = new SpringPart(context);
    this.rounds = new RoundsPart(context, roundGeometry);
    this.gas = new GasPart(context);
    this.body.add(
      this.carrier.object,
      this.bolt.object,
      this.hammer.object,
      this.trigger.object,
      this.spring.object,
      this.rounds.object,
    );
    batchStatic(this.body, this.cutaway).forEach((geometry) => this.tracker.track(geometry));
    this.root.add(this.body, this.gas.object);
    this.labels = new LabelAnchors({
      body: this.body,
      carrier: this.carrier.object,
      bolt: this.bolt.object,
      features: this.bolt.features,
      hammer: this.hammer.object,
      trigger: this.trigger.object,
      bullet: this.rounds.bullet.object,
      live: this.rounds.live.object,
      spent: this.rounds.spent.object,
      gas: this.gas.labelHost,
    });
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const { motion, view } = state;
    if (view.cutaway !== this.shownCut) {
      this.shownCut = view.cutaway;
      this.cutaway.set(view.cutaway);
      this.labels.setCutaway(view.cutaway);
    }
    const travel = boltTravel(motion.carrier);
    const hammer = hammerAngle(motion.hammer, travel);
    this.carrier.set(motion.carrier);
    this.bolt.set(travel, motion.bolt, pinPush(hammer, travel));
    this.hammer.set(hammer);
    this.trigger.set(motion.trigger);
    this.spring.set(motion.carrier);
    this.rounds.setState(state);
    this.gas.setState(state);
  }

  update(deltaSeconds: number, _cameraDistance: number): boolean {
    return this.gas.update(deltaSeconds);
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

  warmUp(compile: (object: Object3D) => void): void {
    const seen = new Set<Material>();
    this.root.traverse((object) => {
      if (!isDrawable(object) || isShown(object) || seen.has(object.material)) return;
      seen.add(object.material);
      compile(object);
    });
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
