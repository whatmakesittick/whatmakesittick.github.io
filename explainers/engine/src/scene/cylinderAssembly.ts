import { Color } from 'three';
import type { Group, Object3D, PointsMaterial } from 'three';
import type { ResourceTracker } from '@core/scene/resources';
import {
  cylinderAngle,
  exhaustLift,
  gasState,
  intakeLift,
  isIgnitionActive,
  pistonPinHeight,
  rodTilt,
} from '../model';
import type { EngineSpec } from '../model';
import type { PartId } from '../state';
import { THEME } from '../theme';
import { PISTON } from './constants';
import { CombustionLight } from './combustionLight';
import type { EngineDimensions } from './dimensions';
import { GasAppearanceModel } from './gasAppearance';
import type { CylinderPlacement } from './layout';
import type { ChamberPart } from './parts/combustionChamber';
import type { InjectorPart } from './parts/injector';
import type { PistonPart } from './parts/piston';
import type { PortPart } from './parts/port';
import type { RodPart } from './parts/connectingRod';
import type { SparkPlugPart } from './parts/sparkPlug';
import type { ValveTrainPart } from './parts/valveTrain';
import { FlowStream } from './particles/flowStream';
import { FuelSpray } from './particles/fuelSpray';
import { SparkTrigger } from './sparkTrigger';

export interface CylinderParts {
  piston: PistonPart;
  rod: RodPart;
  intakeValve: ValveTrainPart;
  exhaustValve: ValveTrainPart;
  intakePort: PortPart;
  exhaustPort: PortPart;
  chamber: ChamberPart;
  sparkPlug: SparkPlugPart | null;
  injector: InjectorPart | null;
}

export interface CylinderMounts {
  root: Group;
  head: Group;
}

export interface ParticleSetup {
  flowMaterial: PointsMaterial;
  sprayMaterial: PointsMaterial;
  flowCount: number;
  tracker: ResourceTracker;
}

interface ValveLifts {
  intake: number;
  exhaust: number;
}

export interface CylinderFrame {
  engineAngle: number;
  deltaDegrees: number;
  deltaSeconds: number;
  headFaceHeight: number;
  gasEmphasis: number;
}

const EXHAUST_PARTICLE_LIGHTEN = 0.35;
const EXHAUST_PARTICLE_COLOR = new Color(THEME.exhaust).lerp(
  new Color(THEME.text),
  EXHAUST_PARTICLE_LIGHTEN,
);

function freshChargeColor(spec: EngineSpec): Color {
  return new Color(spec.intakeCharge === 'mixture' ? THEME.intake : THEME.air);
}

export class CylinderAssembly {
  readonly anchors: Partial<Record<PartId, Object3D>>;
  private readonly parts: CylinderParts;
  private readonly placement: CylinderPlacement;
  private spec: EngineSpec;
  private readonly dims: EngineDimensions;
  private readonly light: CombustionLight;
  private readonly flowStreams: FlowStream[];
  private readonly spray: FuelSpray | null;
  private readonly sparkTrigger = new SparkTrigger();
  private readonly gasModel = new GasAppearanceModel();

  constructor(
    placement: CylinderPlacement,
    parts: CylinderParts,
    context: { spec: EngineSpec; dims: EngineDimensions },
    mounts: CylinderMounts,
    particles: ParticleSetup,
  ) {
    this.placement = placement;
    this.parts = parts;
    this.spec = context.spec;
    this.dims = context.dims;
    this.light = new CombustionLight(placement.z);
    this.flowStreams = this.createFlowStreams(particles);
    this.spray = parts.injector ? this.createSpray(parts.injector, particles) : null;
    this.mount(mounts);
    this.anchors = this.collectAnchors();
  }

  private createFlowStreams({ flowMaterial, flowCount, tracker }: ParticleSetup): FlowStream[] {
    const { intake, exhaust } = this.dims.valves;
    const bore = this.dims.boreRadius;
    const streams = [
      new FlowStream(intake, 'in', flowCount, freshChargeColor(this.spec), bore, flowMaterial),
      new FlowStream(exhaust, 'out', flowCount, EXHAUST_PARTICLE_COLOR, bore, flowMaterial),
    ];
    streams.forEach((stream) => tracker.track(stream.cloud.points.geometry));
    return streams;
  }

  private createSpray(
    injector: InjectorPart,
    { sprayMaterial, tracker }: ParticleSetup,
  ): FuelSpray {
    const spray = new FuelSpray(injector.nozzle, this.spec.bore, sprayMaterial);
    tracker.track(spray.cloud.points.geometry);
    return spray;
  }

  private mount({ root, head }: CylinderMounts): void {
    const { piston, rod, chamber, intakeValve, exhaustValve, intakePort, exhaustPort } = this.parts;
    root.add(piston.object, rod.object, chamber.object, this.light.light);
    head.add(intakeValve.object, exhaustValve.object, intakePort.object, exhaustPort.object);
    const ignition = this.parts.sparkPlug ?? this.parts.injector;
    if (ignition) head.add(ignition.object);
    this.flowStreams.forEach((stream) => {
      stream.cloud.points.position.z = this.placement.z;
      head.add(stream.cloud.points);
    });
    if (this.spray) {
      this.spray.cloud.points.position.z = this.placement.z;
      head.add(this.spray.cloud.points);
    }
  }

  private collectAnchors(): Partial<Record<PartId, Object3D>> {
    const parts = this.parts;
    return {
      piston: parts.piston.labelAnchor,
      connectingRod: parts.rod.labelAnchor,
      intakeValve: parts.intakeValve.labelAnchor,
      exhaustValve: parts.exhaustValve.labelAnchor,
      intakePort: parts.intakePort.labelAnchor,
      exhaustPort: parts.exhaustPort.labelAnchor,
      combustionChamber: parts.chamber.labelAnchor,
      ...(parts.sparkPlug ? { sparkPlug: parts.sparkPlug.labelAnchor } : {}),
      ...(parts.injector ? { injector: parts.injector.labelAnchor } : {}),
    };
  }

  setSpec(spec: EngineSpec): void {
    this.spec = spec;
  }

  setGasVisible(visible: boolean): void {
    this.parts.chamber.object.visible = visible;
  }

  setFlowVisible(visible: boolean): void {
    this.flowStreams.forEach((stream) => {
      stream.cloud.points.visible = visible;
    });
  }

  get sparking(): boolean {
    return this.sparkTrigger.lit;
  }

  update(frame: CylinderFrame): void {
    const angle = cylinderAngle(frame.engineAngle, this.placement.slot);
    const crownHeight = this.updateMechanism(angle);
    const lifts = this.updateValves(angle);
    this.updateCombustion(angle, frame, crownHeight);
    this.updateParticles(angle, frame, lifts, frame.headFaceHeight - crownHeight);
  }

  private updateMechanism(angle: number): number {
    const geometry = this.dims.geometry;
    const pinHeight = pistonPinHeight(angle, geometry);
    this.parts.piston.setPinHeight(pinHeight);
    this.parts.rod.update(pinHeight, rodTilt(angle, geometry));
    return pinHeight + PISTON.pinToCrown;
  }

  private updateValves(angle: number): ValveLifts {
    const lifts = { intake: intakeLift(angle, this.spec), exhaust: exhaustLift(angle, this.spec) };
    this.parts.intakeValve.setLift(lifts.intake);
    this.parts.exhaustValve.setLift(lifts.exhaust);
    return lifts;
  }

  private updateCombustion(angle: number, frame: CylinderFrame, crownHeight: number): void {
    const { headFaceHeight, deltaDegrees, deltaSeconds, gasEmphasis } = frame;
    const appearance = this.gasModel.evaluate(gasState(angle, this.spec), angle, this.spec);
    this.parts.chamber.update(crownHeight, headFaceHeight, appearance, gasEmphasis);
    const spark = this.sparkTrigger.update(angle, deltaDegrees, deltaSeconds, this.spec);
    this.parts.sparkPlug?.setSpark(spark);
    this.light.update((crownHeight + headFaceHeight) / 2, appearance.glow, spark);
  }

  private updateParticles(
    angle: number,
    frame: CylinderFrame,
    lifts: ValveLifts,
    chamberDepth: number,
  ): void {
    const [intakeStream, exhaustStream] = this.flowStreams;
    const common = {
      deltaDegrees: frame.deltaDegrees,
      maxLift: this.spec.maxValveLift,
      chamberDepth,
    };
    if (intakeStream.cloud.points.visible) intakeStream.update({ ...common, lift: lifts.intake });
    if (exhaustStream.cloud.points.visible)
      exhaustStream.update({ ...common, lift: lifts.exhaust });
    this.spray?.update({
      deltaDegrees: frame.deltaDegrees,
      active: isIgnitionActive(angle, this.spec),
      chamberDepth,
    });
  }
}
