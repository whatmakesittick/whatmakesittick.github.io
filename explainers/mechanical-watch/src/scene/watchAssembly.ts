import { Group } from 'three';
import type { Box3, Object3D } from 'three';
import { toRadians } from '@core/math';
import type { MaterialLibrary } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, ViewOptions, WheelId } from '../ids';
import { WHEEL_IDS } from '../ids';
import {
  balanceAngle,
  forkAngle,
  motionWorksAngles,
  timeOnDialSeconds,
  wheelAngles,
  windingAngles,
} from '../model/kinematics';
import { BALANCE_CENTRE, CROWN_WHEEL_CENTRE, WHEEL_CENTRES } from '../model/layout';
import { LEVELS, UNITS_PER_MM } from '../model/scale';
import { MOTION_WORKS } from '../model/train';
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
const DEGREES_PER_HOUR = 360;
const SECONDS_PER_HOUR = 3600;
const HOURS_ON_DIAL = 12;
const SECONDS_START = motionWorksAngles(0, 0).second;
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

export class WatchAssembly implements Assembly {
  readonly root = new Group();
  private readonly movement = new Group();
  private readonly bridgeLayer = new Group();
  private readonly dialLayer = new Group();
  private readonly tracker = new ResourceTracker();
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

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    const context: PartContext = {
      ...resources,
      tracker: this.tracker,
      surfaces: createSurfaces(this.tracker),
    };
    this.movement.scale.setScalar(UNITS_PER_MM);
    this.movement.add(this.bridgeLayer, this.dialLayer);
    this.root.add(this.movement);
    const frame = this.movement;
    const phases = escapementPhases(trainPhases());
    const winding = windingPhases();
    this.barrel = new BarrelPart(context, frame, phases.barrel.wheel);
    this.mainspring = new MainspringPart(context, this.barrel.object);
    this.arbor = new BarrelArborPart(context, frame);
    this.ratchet = new RatchetWheelPart(context, frame, winding.ratchet);
    this.crownWheel = new CrownWheelPart(context, frame, winding.crownWheel);
    this.click = new ClickPart(context, frame, winding.ratchet);
    this.keyless = new KeylessPart(context, frame);
    this.wheels = Object.fromEntries(
      TRAIN_WHEEL_IDS.map((id) => [id, new TrainWheelPart(context, frame, id, phases[id])]),
    ) as Record<TrainWheelId, TrainWheelPart>;
    this.fork = new PalletForkPart(context, frame);
    this.balance = new BalancePart(context, frame);
    this.hairspring = new HairspringPart(context, frame);
    this.regulator = new RegulatorPart(context, frame);
    this.jewels = new JewelsPart(context, frame, this.bridgeLayer);
    this.motionWorks = new MotionWorksPart(context, frame);
    this.hands = this.buildHands(context);
    this.energy = new EnergyPathPart(context);
    frame.add(this.energy.object);
    this.buildStatic(context);
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

  update(deltaSeconds: number, cameraDistance: number): void {
    this.energy.update(deltaSeconds, cameraDistance);
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
    const hands = motionWorksAngles(state.phase, state.cycles);
    this.hands.hourHand.setAngle(hands.hour);
    this.hands.minuteHand.setAngle(hands.minute);
    this.hands.secondHand.setAngle(SECONDS_START + angles.fourthWheel);
    const minutes =
      (timeOnDialSeconds(state.phase, state.cycles) / SECONDS_PER_HOUR) * DEGREES_PER_HOUR;
    const { cannonPinion, minuteWheel } = MOTION_WORKS;
    this.motionWorks.setAngles({
      cannonPinion: minutes,
      minuteWheel: (-minutes * cannonPinion.leaves) / minuteWheel.teeth,
      hourWheel: minutes / HOURS_ON_DIAL,
    });
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

  private buildHands(
    context: PartContext,
  ): Record<'hourHand' | 'minuteHand' | 'secondHand', HandPart> {
    const layer = this.dialLayer;
    return {
      hourHand: new HandPart(context, layer, 'hourHand', HANDS.hour, LEVELS.hourHand, CENTRE),
      minuteHand: new HandPart(
        context,
        layer,
        'minuteHand',
        HANDS.minute,
        LEVELS.minuteHand,
        CENTRE,
      ),
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

  private buildStatic(context: PartContext): void {
    const frame = this.movement;
    const bridges = createBridges(context, this.bridgeLayer);
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
    this.bridgeLayer.add(bridgeScrews);
    frame.add(windingScrews);
    const entries: [PartId, Object3D][] = [
      ['mainplate', createMainplate(context, frame)],
      ['bankingPins', createBankingPins(context, frame)],
      ['stud', createStud(context, frame)],
      ['barrelBridge', bridges.barrelBridge],
      ['trainBridge', bridges.trainBridge],
      ['balanceCock', createBalanceCock(context, this.bridgeLayer)],
      ['shockJewel', createShockJewel(context, this.bridgeLayer)],
      ['case', createCase(context, this.dialLayer)],
      ['dial', createDial(context, this.dialLayer)],
    ];
    entries.forEach(([id, anchor]) => this.anchors.set(id, anchor));
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
