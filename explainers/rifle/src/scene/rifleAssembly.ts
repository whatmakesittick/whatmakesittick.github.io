import { Group, Mesh, Points, Sprite } from 'three';
import type { Box3, Material, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { runPaced } from '@core/scene/pacing';
import type { Steps } from '@core/scene/pacing';
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
import { BackdropPart } from './parts/backdrop/backdrop';
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

interface AssemblyParts {
  tracker: ResourceTracker;
  cutaway: CutawaySwitch;
  body: Group;
  carrier: CarrierPart;
  bolt: BoltPart;
  hammer: HammerPart;
  trigger: TriggerPart;
  spring: SpringPart;
  rounds: RoundsPart;
  gas: GasPart;
  backdrop: BackdropPart;
}

type Drawable = (Mesh | Points | Sprite) & { material: Material };

function isDrawable(object: Object3D): object is Drawable {
  const drawable = object instanceof Mesh || object instanceof Points || object instanceof Sprite;
  return drawable && !Array.isArray((object as Drawable).material);
}

export class RifleAssembly implements Assembly {
  readonly root = new Group();
  private readonly body: Group;
  private readonly gas: GasPart;
  private readonly backdrop: BackdropPart;
  private readonly tracker: ResourceTracker;
  private readonly materials: MaterialLibrary;
  private readonly cutaway: CutawaySwitch;
  private readonly carrier: CarrierPart;
  private readonly bolt: BoltPart;
  private readonly hammer: HammerPart;
  private readonly trigger: TriggerPart;
  private readonly spring: SpringPart;
  private readonly rounds: RoundsPart;
  private readonly labels: LabelAnchors;
  private shownCut: boolean | null = null;

  constructor(resources: AssemblyResources, parts: AssemblyParts, state: AssemblyState) {
    const { carrier, bolt, hammer, trigger, spring, rounds, gas, backdrop } = parts;
    this.materials = resources.materials;
    this.tracker = parts.tracker;
    this.cutaway = parts.cutaway;
    this.body = parts.body;
    this.carrier = carrier;
    this.bolt = bolt;
    this.hammer = hammer;
    this.trigger = trigger;
    this.spring = spring;
    this.rounds = rounds;
    this.gas = gas;
    this.backdrop = backdrop;
    this.root.add(backdrop.object, this.body, gas.object);
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
    this.backdrop.setState(state);
  }

  update(deltaSeconds: number, _cameraDistance: number): boolean {
    const gasMoving = this.gas.update(deltaSeconds);
    const backdropMoving = this.backdrop.update(deltaSeconds);
    return gasMoving || backdropMoving;
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

function* buildParts(resources: AssemblyResources): Steps<AssemblyParts> {
  const tracker = new ResourceTracker();
  const cutaway = new CutawaySwitch();
  const body = new Group();
  const stock = tracker.track(woodGrain(WOOD_GRAIN.stock));
  yield;
  const handguard = tracker.track(woodGrain(WOOD_GRAIN.handguard));
  yield;
  const powder = tracker.track(powderGrain(POWDER_GRAIN));
  const context: PartContext = {
    ...resources,
    tracker,
    cutaway,
    looks: createLooks({ stock, handguard, powder }),
  };
  yield;
  const roundGeometry = createRoundGeometry(context);
  addBarrel(context, body);
  yield;
  addGasSystem(context, body);
  yield;
  addSights(context, body);
  addFurniture(context, body);
  yield;
  addReceiver(context, body);
  yield;
  addMagazine(context, body);
  addMagazineStack(context, body, roundGeometry);
  body.add(createSelector(context));
  addSelectorMarks(context, body);
  yield;
  const carrier = new CarrierPart(context);
  const bolt = new BoltPart(context);
  const hammer = new HammerPart(context);
  const trigger = new TriggerPart(context);
  const spring = new SpringPart(context);
  const rounds = new RoundsPart(context, roundGeometry);
  yield;
  const gas = new GasPart(context);
  const backdrop = new BackdropPart(context);
  yield;
  body.add(
    carrier.object,
    bolt.object,
    hammer.object,
    trigger.object,
    spring.object,
    rounds.object,
  );
  batchStatic(body, cutaway).forEach((geometry) => tracker.track(geometry));
  return { tracker, cutaway, body, carrier, bolt, hammer, trigger, spring, rounds, gas, backdrop };
}

export async function createRifleAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Promise<Assembly> {
  return new RifleAssembly(resources, await runPaced(buildParts(resources)), state);
}
