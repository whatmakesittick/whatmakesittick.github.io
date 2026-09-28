import { Group } from 'three';
import type { Box3, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import { SITE_PARTS, SITE_STATES } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId, ViewOptions } from '../ids';
import { flowClock } from '../model/rotor';
import { GATE, HEAD, SPACE_LABELS, UNITS_PER_NM, spanMiddle } from '../model/scale';
import type { Assembly, AssemblyResources } from './assembly';
import { setPolar } from './flow/points';
import { ringLayout } from './geometry/ringLayout';
import type { PartContext } from './parts/context';
import { ElectronsPart } from './parts/flow/electrons';
import { MoleculesPart } from './parts/flow/molecules';
import { OxygenPart } from './parts/flow/oxygen';
import { ProtonsPart } from './parts/flow/protons';
import type { ProtonMotion } from './parts/flow/protons';
import { SeatsPart } from './parts/head/seats';
import { MembranePart } from './parts/membrane/membrane';
import { MotorPart } from './parts/motor/motor';
import { MotorLabels } from './parts/motor/motorLabels';
import { SpeedBlurPart } from './parts/motor/speedBlur';
import { PumpsPart } from './parts/pumps/pumps';
import { RowPart } from './parts/row/row';
import { regionBox } from './regions';

type ViewKey = keyof ViewOptions;

const VIEW_KEYS: readonly ViewKey[] = ['membrane', 'cutaway', 'flow', 'labels'];

const GATE_MIDDLE = spanMiddle([GATE.innerRadius, GATE.outerRadius]);

function copyState(target: AssemblyState, source: AssemblyState): void {
  target.rotorDeg = source.rotorDeg;
  target.laps = source.laps;
  target.degreesPerSecond = source.degreesPerSecond;
  target.bladeCount = source.bladeCount;
  target.motorCount = source.motorCount;
  for (const key of VIEW_KEYS) target.view[key] = source.view[key];
}

function viewChanged(current: ViewOptions, next: ViewOptions): boolean {
  for (const key of VIEW_KEYS) if (current[key] !== next[key]) return true;
  return false;
}

export class SynthaseAssembly implements Assembly {
  readonly root = new Group();
  private readonly frame = new Group();
  private readonly flow = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly membrane: MembranePart;
  private readonly hero: MotorPart;
  private readonly heroLabels: MotorLabels;
  private readonly seats: SeatsPart;
  private readonly blur: SpeedBlurPart;
  private readonly pumps: PumpsPart;
  private readonly protons: ProtonsPart;
  private readonly molecules: MoleculesPart;
  private readonly electrons: ElectronsPart;
  private readonly oxygen: OxygenPart;
  private readonly row: RowPart;
  private readonly labels = new Map<PartId, Object3D>();
  private readonly named: Record<AnchorId, Object3D>;
  private readonly state: AssemblyState;
  private readonly protonMotion: ProtonMotion = {
    rotorDeg: 0,
    clockDeg: 0,
    bladeCount: 0,
    ringBlurred: false,
    calm: 0,
    presence: 1,
  };

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    this.state = { ...state, view: { ...state.view } };
    const context: PartContext = { ...resources, tracker: this.tracker };
    this.frame.scale.setScalar(UNITS_PER_NM);
    this.root.add(this.frame);
    this.membrane = new MembranePart(context, this.frame);
    this.hero = new MotorPart(context, state.bladeCount);
    this.heroLabels = new MotorLabels(this.frame, state.bladeCount);
    this.seats = new SeatsPart(context);
    this.blur = new SpeedBlurPart(context, state.bladeCount);
    this.hero.rotor.object.add(this.blur.object);
    this.pumps = new PumpsPart(context);
    this.protons = new ProtonsPart(context);
    this.molecules = new MoleculesPart(context);
    this.electrons = new ElectronsPart(context);
    this.oxygen = new OxygenPart(context);
    this.row = new RowPart(context);
    this.flow.add(
      this.protons.object,
      this.molecules.object,
      this.electrons.object,
      this.oxygen.object,
    );
    this.frame.add(this.hero.object, this.seats.object, this.pumps.object, this.row.object);
    this.frame.add(this.flow);
    this.named = {
      ring: anchorAt(this.frame, 0, 0, 0),
      gate: anchorAt(this.frame, 0, 0, 0),
      head: anchorAt(this.frame, 0, spanMiddle(HEAD.span), 0),
      pumps: this.pumps.anchor,
    };
    this.collectLabels();
    this.applyBladeCount(state.bladeCount);
    this.applyView(state.view);
    this.applyMotion();
  }

  setState(state: AssemblyState): void {
    const current = this.state;
    if (current.bladeCount !== state.bladeCount) this.applyBladeCount(state.bladeCount);
    const changedView = viewChanged(current.view, state.view);
    copyState(current, state);
    if (changedView) this.applyView(current.view);
    this.applyMotion();
  }

  update(deltaSeconds: number, _cameraDistance: number): boolean {
    if (!this.blur.update(deltaSeconds, this.state.degreesPerSecond)) return false;
    this.hero.rotor.setRingShown(!this.blur.ringBlurred);
    if (this.state.view.flow) this.placeFlow();
    return true;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    return this.named[id];
  }

  region(id: RegionId): Box3 {
    this.root.updateMatrixWorld(true);
    return regionBox(id, this.state, this.frame.matrixWorld);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.materials.clearRegistered();
    this.tracker.dispose();
  }

  private applyBladeCount(bladeCount: number): void {
    this.hero.setBladeCount(bladeCount);
    this.heroLabels.setBladeCount(bladeCount);
    this.blur.setBladeCount(bladeCount);
    const radius = GATE_MIDDLE + ringLayout(bladeCount).growth;
    setPolar(this.named.gate.position, GATE.azimuthDeg, radius, 0);
  }

  private applyView(view: ViewOptions): void {
    this.membrane.setVisible(view.membrane);
    this.hero.setCutaway(view.cutaway);
    this.flow.visible = view.flow;
    this.blur.setProtonsShown(view.flow);
  }

  private applyMotion(): void {
    const { rotorDeg, motorCount } = this.state;
    this.hero.setAngle(rotorDeg);
    this.seats.place(rotorDeg);
    this.row.place(rotorDeg, motorCount);
    if (this.state.view.flow) this.placeFlow();
  }

  private placeFlow(): void {
    const { rotorDeg, laps, bladeCount } = this.state;
    const clockDeg = flowClock(rotorDeg, laps);
    const motion = this.protonMotion;
    motion.rotorDeg = rotorDeg;
    motion.clockDeg = clockDeg;
    motion.bladeCount = bladeCount;
    motion.ringBlurred = this.blur.ringBlurred;
    motion.calm = this.blur.calm;
    motion.presence = this.blur.flowPresence;
    this.protons.place(motion);
    this.molecules.place(rotorDeg, motion.presence);
    this.electrons.place(clockDeg, bladeCount, motion.presence);
    this.oxygen.place(clockDeg, bladeCount, motion.presence);
  }

  private collectLabels(): void {
    this.heroLabels.anchors.forEach((anchor, id) => this.labels.set(id, anchor));
    SITE_STATES.forEach((state) => this.labels.set(SITE_PARTS[state], this.seats.labels[state]));
    const spaces = (['matrix', 'intermembraneSpace'] as const).map((id): [PartId, Object3D] => {
      const at = SPACE_LABELS[id];
      return [id, anchorAt(this.frame, at.x, at.y, at.z)];
    });
    const entries: [PartId, Object3D][] = [
      ['membrane', this.membrane.label],
      ['atp', this.molecules.labels.atp],
      ['adpPhosphate', this.molecules.labels.adpPhosphate],
      ['protons', this.protons.label],
      ['pumps', this.pumps.label],
      ['electrons', this.electrons.label],
      ['oxygen', this.oxygen.label],
      ['neighbourMotors', this.row.label],
      ...spaces,
    ];
    entries.forEach(([id, anchor]) => this.labels.set(id, anchor));
  }
}
