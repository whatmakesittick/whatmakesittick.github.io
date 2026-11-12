import { Group } from 'three';
import type { Box3, Object3D } from 'three';
import { toRadians } from '@core/math';
import type { MaterialLibrary } from '@core/scene/materials';
import { runPaced } from '@core/scene/pacing';
import type { Steps } from '@core/scene/pacing';
import { anchorAt } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, ViewOptions, WheelId } from '../ids';
import { WHEEL_IDS } from '../ids';
import {
  balanceAngle,
  forkAngle,
  motionWorksAngles,
  wheelAngles,
  windingAngles,
} from '../model/kinematics';
import { BALANCE_CENTRE, CROWN_WHEEL_CENTRE, WHEEL_CENTRES } from '../model/layout';
import { LEVELS, UNITS_PER_MM } from '../model/scale';
import type { RegionId } from '../ids';
import type { Assembly, AssemblyResources } from './assembly';
import {
  ANCHOR_LIFT_MM,
  BALANCE_COCK,
  BALANCE_WHEEL,
  BARREL_BRIDGE,
  BRIDGE_LEVEL,
  CLICK,
  CROWN_WHEEL,
  HANDS,
  TRAIN_BRIDGE,
} from './constants';
import type { PartContext } from './parts/context';
import { createSurfaces } from './parts/surfaces';
import { createCase } from './parts/dial/case';
import { createDial } from './parts/dial/dial';
import { HandPart } from './parts/dial/hands';
import { MotionWorksPart } from './parts/dial/motionWorks';
import { EnergyPathPart } from './parts/energy/energyPath';
import { createBankingPins } from './parts/escapement/bankingPins';
import { PalletForkPart } from './parts/escapement/palletFork';
import { restingToothDeg } from './parts/escapement/palletLayout';
import { BalancePart } from './parts/oscillator/balance';
import { cockFeet, createBalanceCock } from './parts/oscillator/balanceCock';
import { HairspringPart } from './parts/oscillator/hairspring';
import { RegulatorPart } from './parts/oscillator/regulator';
import { createShockJewel } from './parts/oscillator/shockJewel';
import { createStud } from './parts/oscillator/stud';
import { createBridges } from './parts/plates/bridges';
import { createEngraving } from './parts/plates/engraving';
import { JewelsPart } from './parts/plates/jewels';
import { createMainplate } from './parts/plates/mainplate';
import { createScrews } from './parts/plates/screws';
import type { ScrewSeat } from './parts/plates/screws';
import { BarrelPart } from './parts/train/barrel';
import { MainspringPart } from './parts/train/mainspring';
import { trainPhases } from './parts/train/phases';
import type { WheelPhase } from './parts/train/phases';
import { TrainWheelPart } from './parts/train/trainWheel';
import type { TrainWheelId } from './parts/train/trainWheel';
import { BarrelArborPart } from './parts/winding/barrelArbor';
import { CLICK_PIVOT, ClickPart } from './parts/winding/click';
import { CrownWheelPart } from './parts/winding/crownWheel';
import { KeylessPart } from './parts/winding/keyless';
import { RatchetWheelPart } from './parts/winding/ratchetWheel';
import { windingPhases } from './parts/winding/windingPhases';
import { regionBox } from './regions';

type ViewKey = keyof ViewOptions;

const TRAIN_WHEEL_IDS: readonly TrainWheelId[] = [
  'centreWheel',
  'thirdWheel',
  'fourthWheel',
  'escapeWheel',
];
const CENTRE = { x: 0, y: 0 };

function snapshot(state: AssemblyState): AssemblyState {
  const { phase, cycles, amplitude, reserve, regulator, view } = state;
  return { phase, cycles, amplitude, reserve, regulator, view: { ...view } };
}

function viewChanged(previous: AssemblyState | null, next: AssemblyState, key: ViewKey): boolean {
  return !previous || previous.view[key] !== next.view[key];
}

function motionChanged(previous: AssemblyState | null, next: AssemblyState): boolean {
  if (!previous) return true;
  return (
    previous.phase !== next.phase ||
    previous.cycles !== next.cycles ||
    previous.amplitude !== next.amplitude
  );
}

function escapementPhases(
  phases: Readonly<Record<WheelId, WheelPhase>>,
): Record<WheelId, WheelPhase> {
  const escape = { ...phases.escapeWheel, wheel: toRadians(restingToothDeg()) };
  return { ...phases, escapeWheel: escape };
}

function withZ(points: readonly { x: number; y: number }[], z: number): ScrewSeat[] {
  return points.map((point) => ({ x: point.x, y: point.y, z }));
}

function* buildStatic(
  context: PartContext,
  frame: Group,
  bridgeLayer: Group,
  dialLayer: Group,
): Steps<[PartId, Object3D][]> {
  const bridges = createBridges(context, bridgeLayer);
  yield;
  createEngraving(context, bridgeLayer);
  yield;
  const bridgeScrews = createScrews(context, [
    ...withZ(BARREL_BRIDGE.screws, BRIDGE_LEVEL.barrel[1]),
    ...withZ(TRAIN_BRIDGE.screws, BRIDGE_LEVEL.train[1]),
    ...withZ(cockFeet(), BALANCE_COCK.arm[1]),
  ]);
  const windingScrews = createScrews(context, [
    { ...CROWN_WHEEL_CENTRE, z: CROWN_WHEEL.boss.span[1] },
    { ...CLICK_PIVOT, z: CLICK.level[1] },
    { ...CLICK.spring.anchor, z: CLICK.spring.level[1] },
  ]);
  bridgeLayer.add(bridgeScrews);
  frame.add(windingScrews);
  yield;
  const mainplate = createMainplate(context, frame);
  yield;
  return [
    ['mainplate', mainplate],
    ['bankingPins', createBankingPins(context, frame)],
    ['stud', createStud(context, frame)],
    ['barrelBridge', bridges.barrelBridge],
    ['trainBridge', bridges.trainBridge],
    ['balanceCock', createBalanceCock(context, bridgeLayer)],
    ['shockJewel', createShockJewel(context, bridgeLayer)],
    ['case', createCase(context, dialLayer)],
    ['dial', createDial(context, dialLayer)],
  ];
}

function buildHands(context: PartContext, layer: Group) {
  return {
    hourHand: new HandPart(context, layer, 'hourHand', HANDS.hour, LEVELS.hourHand, CENTRE),
    minuteHand: new HandPart(context, layer, 'minuteHand', HANDS.minute, LEVELS.minuteHand, CENTRE),
    secondHand: new HandPart(
      context,
      layer,
      'secondHand',
      HANDS.second,
      LEVELS.secondHand,
      WHEEL_CENTRES.fourthWheel,
    ),
  };
}

function* buildParts(context: PartContext) {
  const movement = new Group();
  const bridgeLayer = new Group();
  const dialLayer = new Group();
  movement.scale.setScalar(UNITS_PER_MM);
  movement.add(bridgeLayer, dialLayer);
  const frame = movement;
  const phases = escapementPhases(trainPhases());
  const winding = windingPhases();
  const barrel = new BarrelPart(context, frame, phases.barrel.wheel);
  const mainspring = new MainspringPart(context, barrel.object);
  const arbor = new BarrelArborPart(context, frame);
  yield;
  const ratchet = new RatchetWheelPart(context, frame, winding.ratchet);
  const crownWheel = new CrownWheelPart(context, frame, winding.crownWheel);
  const click = new ClickPart(context, frame, winding.ratchet);
  const keyless = new KeylessPart(context, frame);
  yield;
  const wheels = {} as Record<TrainWheelId, TrainWheelPart>;
  for (const id of TRAIN_WHEEL_IDS) {
    wheels[id] = new TrainWheelPart(context, frame, id, phases[id]);
    yield;
  }
  const fork = new PalletForkPart(context, frame);
  const balance = new BalancePart(context, frame);
  yield;
  const hairspring = new HairspringPart(context, frame);
  const regulator = new RegulatorPart(context, frame);
  const jewels = new JewelsPart(context, frame, bridgeLayer);
  yield;
  const motionWorks = new MotionWorksPart(context, frame);
  const hands = buildHands(context, dialLayer);
  const energy = new EnergyPathPart(context);
  frame.add(energy.object);
  yield;
  const statics = yield* buildStatic(context, frame, bridgeLayer, dialLayer);
  return {
    movement,
    bridgeLayer,
    dialLayer,
    barrel,
    mainspring,
    arbor,
    ratchet,
    crownWheel,
    click,
    keyless,
    wheels,
    fork,
    balance,
    hairspring,
    regulator,
    jewels,
    motionWorks,
    hands,
    energy,
    statics,
  };
}

type WatchParts = ReturnType<typeof buildParts> extends Generator<void, infer P> ? P : never;

export class WatchAssembly implements Assembly {
  readonly root = new Group();
  private readonly movement: Group;
  private readonly bridgeLayer: Group;
  private readonly dialLayer: Group;
  private readonly tracker: ResourceTracker;
  private readonly materials: MaterialLibrary;
  private readonly barrel: BarrelPart;
  private readonly mainspring: MainspringPart;
  private readonly arbor: BarrelArborPart;
  private readonly ratchet: RatchetWheelPart;
  private readonly crownWheel: CrownWheelPart;
  private readonly click: ClickPart;
  private readonly keyless: KeylessPart;
  private readonly wheels: Record<TrainWheelId, TrainWheelPart>;
  private readonly fork: PalletForkPart;
  private readonly balance: BalancePart;
  private readonly hairspring: HairspringPart;
  private readonly regulator: RegulatorPart;
  private readonly jewels: JewelsPart;
  private readonly motionWorks: MotionWorksPart;
  private readonly hands: Record<'hourHand' | 'minuteHand' | 'secondHand', HandPart>;
  private readonly energy: EnergyPathPart;
  private readonly anchors = new Map<PartId, Object3D>();
  private readonly named: Record<AnchorId, Object3D>;
  private state: AssemblyState | null = null;

  constructor(
    resources: AssemblyResources,
    tracker: ResourceTracker,
    parts: WatchParts,
    state: AssemblyState,
  ) {
    this.materials = resources.materials;
    this.tracker = tracker;
    ({
      movement: this.movement,
      bridgeLayer: this.bridgeLayer,
      dialLayer: this.dialLayer,
      barrel: this.barrel,
      mainspring: this.mainspring,
      arbor: this.arbor,
      ratchet: this.ratchet,
      crownWheel: this.crownWheel,
      click: this.click,
      keyless: this.keyless,
      wheels: this.wheels,
      fork: this.fork,
      balance: this.balance,
      hairspring: this.hairspring,
      regulator: this.regulator,
      jewels: this.jewels,
      motionWorks: this.motionWorks,
      hands: this.hands,
      energy: this.energy,
    } = parts);
    this.root.add(this.movement);
    parts.statics.forEach(([id, anchor]) => this.anchors.set(id, anchor));
    this.named = {
      barrel: this.barrel.anchor,
      centreWheel: this.wheels.centreWheel.anchor,
      thirdWheel: this.wheels.thirdWheel.anchor,
      fourthWheel: this.wheels.fourthWheel.anchor,
      escapeWheel: this.wheels.escapeWheel.anchor,
      fork: this.fork.anchor,
      balance: this.anchorAtStaffTop(),
      crown: this.keyless.anchor,
    };
    this.collectMovingAnchors();
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const previous = this.state;
    this.state = snapshot(state);
    if (motionChanged(previous, state)) this.applyMotion(state);
    if (!previous || previous.reserve !== state.reserve) this.applyReserve(state.reserve);
    if (!previous || previous.regulator !== state.regulator)
      this.regulator.setIndex(state.regulator);
    if (viewChanged(previous, state, 'dial')) this.dialLayer.visible = state.view.dial;
    if (viewChanged(previous, state, 'bridges')) this.applyBridges(state.view.bridges);
    if (viewChanged(previous, state, 'energy')) this.energy.setVisible(state.view.energy);
  }

  update(deltaSeconds: number, cameraDistance: number): boolean {
    return this.energy.update(deltaSeconds, cameraDistance);
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.anchors;
  }

  anchor(id: AnchorId): Object3D {
    return this.named[id];
  }

  region(id: RegionId): Box3 {
    this.root.updateMatrixWorld(true);
    return regionBox(id, this.root.matrixWorld);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.materials.clearRegistered();
    this.tracker.dispose();
  }

  private applyMotion(state: AssemblyState): void {
    const angles = wheelAngles(state.phase, state.cycles, state.amplitude);
    this.barrel.setAngle(angles.barrel);
    TRAIN_WHEEL_IDS.forEach((id) => this.wheels[id].setAngle(angles[id]));
    const theta = balanceAngle(state.phase, state.amplitude);
    this.balance.setAngle(theta);
    this.hairspring.setBalanceAngle(theta);
    this.fork.setAngle(-forkAngle(theta));
    const hands = motionWorksAngles(state.phase, state.cycles, state.amplitude);
    this.hands.hourHand.setAngle(hands.hour);
    this.hands.minuteHand.setAngle(hands.minute);
    this.hands.secondHand.setAngle(hands.second);
    this.motionWorks.setAngles(hands);
  }

  private applyReserve(reserve: number): void {
    const winding = windingAngles(reserve);
    this.arbor.setAngle(winding.arbor);
    this.ratchet.setAngle(winding.ratchetWheel);
    this.click.setRatchetAngle(winding.ratchetWheel);
    this.crownWheel.setAngle(winding.crownWheel);
    this.keyless.setAngle(winding.stem);
    this.mainspring.setReserve(reserve, winding.arbor);
  }

  private applyBridges(shown: boolean): void {
    this.bridgeLayer.visible = shown;
    this.jewels.setBridgesShown(shown);
  }

  private anchorAtStaffTop(): Object3D {
    const [, top] = BALANCE_WHEEL.staff[BALANCE_WHEEL.staff.length - 1];
    return anchorAt(this.movement, BALANCE_CENTRE.x, BALANCE_CENTRE.y, top + ANCHOR_LIFT_MM);
  }

  private collectMovingAnchors(): void {
    const entries: [PartId, Object3D][] = [
      ['barrel', this.barrel.label],
      ['mainspring', this.mainspring.label],
      ['barrelArbor', this.arbor.label],
      ['ratchetWheel', this.ratchet.label],
      ['crownWheel', this.crownWheel.label],
      ['click', this.click.label],
      ['crown', this.keyless.labels.crown],
      ['stem', this.keyless.labels.stem],
      ['windingPinion', this.keyless.labels.windingPinion],
      ...WHEEL_IDS.filter((id): id is TrainWheelId => id !== 'barrel').map(
        (id): [PartId, Object3D] => [id, this.wheels[id].label],
      ),
      ['palletFork', this.fork.labels.palletFork],
      ['entryPallet', this.fork.labels.entryPallet],
      ['exitPallet', this.fork.labels.exitPallet],
      ['balanceWheel', this.balance.labels.balanceWheel],
      ['roller', this.balance.labels.roller],
      ['impulseJewel', this.balance.labels.impulseJewel],
      ['hairspring', this.hairspring.label],
      ['regulator', this.regulator.label],
      ['jewels', this.jewels.label],
      ['cannonPinion', this.motionWorks.labels.cannonPinion],
      ['minuteWheel', this.motionWorks.labels.minuteWheel],
      ['hourWheel', this.motionWorks.labels.hourWheel],
      ['hourHand', this.hands.hourHand.label],
      ['minuteHand', this.hands.minuteHand.label],
      ['secondHand', this.hands.secondHand.label],
    ];
    entries.forEach(([id, anchor]) => this.anchors.set(id, anchor));
  }
}

export async function createWatchAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Promise<WatchAssembly> {
  const tracker = new ResourceTracker();
  const context: PartContext = { ...resources, tracker, surfaces: createSurfaces(tracker) };
  const parts = await runPaced(buildParts(context));
  return new WatchAssembly(resources, tracker, parts, state);
}
