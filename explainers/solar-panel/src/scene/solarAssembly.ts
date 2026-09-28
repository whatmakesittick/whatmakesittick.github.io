import { Group, Quaternion, Vector3 } from 'three';
import { clamp } from '@core/math';
import type { Box3, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, RegionId, ViewOptions } from '../ids';
import { MODULE, sunDirection, sunElevationDeg } from '../model';
import type { Assembly, AssemblyResources } from './assembly';
import { CELL_VIEW_DIRECTION, DETAIL_DISTANCE_CM, FLOW, RAYS, SLICE_FLOW } from './constants';
import { cutSide, photonPath } from './geometry/sliceMotion';
import type { CutSide } from './geometry/sliceMotion';
import { ArrayPart } from './parts/array/array';
import type { PartContext } from './parts/context';
import { CablesPart } from './parts/equipment/cables';
import { InverterPart } from './parts/equipment/inverter';
import { MeterPart } from './parts/equipment/meter';
import { createHouse } from './parts/house/house';
import type { HousePart } from './parts/house/house';
import { skyPalette } from './parts/sky/palette';
import { SkyDomePart } from './parts/sky/skyDome';
import { SunPart } from './parts/sky/sun';
import { SliceBlockPart } from './parts/slice/sliceBlock';
import { SliceFlowPart } from './parts/slice/sliceFlow';
import {
  HOUSE_REGION,
  INVERTER_REGION,
  MOUNTING_REGION,
  moduleRegion,
  regionIn,
  sliceRegion,
  stackRegion,
  union,
} from './regions';

type ViewKey = keyof ViewOptions;

function snapshot(state: AssemblyState): AssemblyState {
  return {
    ...state,
    deadStrings: [...state.deadStrings],
    activeDiodes: [...state.activeDiodes],
    view: { ...state.view },
  };
}

function sameFlags(previous: readonly boolean[], next: readonly boolean[]): boolean {
  return previous.length === next.length && previous.every((flag, index) => flag === next[index]);
}

type FlagKey = 'deadStrings' | 'activeDiodes';

class StateChanges {
  private readonly previous: AssemblyState | null;
  private readonly next: AssemblyState;

  constructor(previous: AssemblyState | null, next: AssemblyState) {
    this.previous = previous;
    this.next = next;
  }

  any(...keys: (keyof AssemblyState)[]): boolean {
    const previous = this.previous;
    return !previous || keys.some((key) => previous[key] !== this.next[key]);
  }

  flags(key: FlagKey): boolean {
    return !this.previous || this.any('layout') || !sameFlags(this.previous[key], this.next[key]);
  }

  view(key: ViewKey): boolean {
    return !this.previous || this.previous.view[key] !== this.next.view[key];
  }
}

function rayTargets(): Vector3[] {
  const targets: Vector3[] = [];
  const width = MODULE.width * (1 - 2 * RAYS.inset);
  const height = MODULE.height * (1 - 2 * RAYS.inset);
  for (let row = 0; row < RAYS.rows; row += 1) {
    for (let column = 0; column < RAYS.columns; column += 1) {
      targets.push(
        new Vector3(
          -width / 2 + (width * column) / (RAYS.columns - 1),
          MODULE.height * RAYS.inset + (height * row) / (RAYS.rows - 1),
          MODULE.depth,
        ),
      );
    }
  }
  return targets;
}

export class SolarAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly house: HousePart;
  private readonly array: ArrayPart;
  private readonly sky: SkyDomePart;
  private readonly sun: SunPart;
  private readonly inverter: InverterPart;
  private readonly meter: MeterPart;
  private readonly slice: SliceBlockPart;
  private readonly cables: CablesPart;
  private readonly sliceFlow: SliceFlowPart;
  private readonly anchors = new Map<PartId, Object3D>();
  private readonly named: Record<AnchorId, Object3D>;
  private readonly faceTargets = rayTargets();
  private state: AssemblyState | null = null;
  private side: CutSide = -1;
  private close: boolean | null = null;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    const context: PartContext = { ...resources, tracker: this.tracker };
    this.house = createHouse(context);
    this.array = new ArrayPart(context);
    this.sky = new SkyDomePart(context);
    this.sun = new SunPart(context);
    this.inverter = new InverterPart(context);
    this.meter = new MeterPart(context);
    this.slice = new SliceBlockPart(context);
    this.cables = new CablesPart(context);
    this.sliceFlow = new SliceFlowPart(context);
    this.slice.block.add(this.sliceFlow.object);
    this.array.heroPivot.add(this.slice.object);
    this.root.add(
      this.sky.mesh,
      this.house.object,
      this.array.object,
      this.sun.object,
      this.inverter.object,
      this.meter.object,
      this.cables.object,
    );
    this.collectAnchors();
    this.named = {
      panel: this.array.hero.anchors.panel,
      sun: this.sun.sun,
      slice: this.slice.block,
      inverter: this.inverter.anchor,
      junctionBox: this.array.hero.anchors.junctionBox,
    };
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const changes = new StateChanges(this.state, state);
    this.state = snapshot(state);
    this.applyPose(changes, state);
    this.applyPanel(changes, state);
    this.applySignals(changes, state);
    this.applyViews(changes, state.view);
  }

  update(deltaSeconds: number, cameraDistance: number): void {
    const pointSize = clamp(cameraDistance * FLOW.sizePerDistance, FLOW.minSize, FLOW.maxSize);
    const close = cameraDistance < DETAIL_DISTANCE_CM;
    if (close !== this.close) {
      this.close = close;
      this.array.hero.setDetail(close);
    }
    this.sun.update(deltaSeconds);
    this.meter.update(deltaSeconds);
    this.cables.update(deltaSeconds, pointSize);
    if (this.slice.object.visible) {
      const scale = clamp(cameraDistance / SLICE_FLOW.referenceDistance, 1, SLICE_FLOW.maxScale);
      this.sliceFlow.update(deltaSeconds, scale);
    }
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.anchors;
  }

  anchor(id: AnchorId): Object3D {
    return this.named[id];
  }

  region(id: RegionId): Box3 {
    this.root.updateMatrixWorld(true);
    const hero = this.array.heroPivot.matrixWorld;
    const state = this.state;
    switch (id) {
      case 'house':
        return regionIn(HOUSE_REGION, this.root.matrixWorld);
      case 'scene':
        return union(regionIn(HOUSE_REGION, this.root.matrixWorld), this.region('array'));
      case 'array':
        return union(
          regionIn(MOUNTING_REGION, this.root.matrixWorld),
          ...this.array.pivots.map((pivot) => regionIn(moduleRegion(), pivot.matrixWorld)),
        );
      case 'panel':
        return regionIn(moduleRegion(), hero);
      case 'stack':
        return regionIn(stackRegion(state?.explode ?? 0, state?.tilt ?? 0), hero);
      case 'slice':
        return regionIn(sliceRegion(this.side), this.slice.block.matrixWorld);
      case 'inverter':
        return regionIn(INVERTER_REGION, this.root.matrixWorld);
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.materials.clearRegistered();
    this.tracker.dispose();
  }

  private applyPose(changes: StateChanges, state: AssemblyState): void {
    if (changes.any('tilt')) this.applyTilt(state.tilt);
    if (changes.any('tilt', 'explode')) this.array.hero.setExplode(state.explode, state.tilt);
    if (changes.any('minute')) this.applyMinute(state.minute);
    if (changes.any('minute', 'tilt')) {
      this.aimRays(state);
      this.aimPhotons(state);
    }
  }

  private applyPanel(changes: StateChanges, state: AssemblyState): void {
    const hero = this.array.hero;
    if (changes.any('layout')) hero.setLayout(state.layout);
    if (changes.any('shade')) hero.setShade(state.shade);
    if (changes.flags('deadStrings')) hero.setDeadStrings(state.deadStrings);
    if (changes.flags('activeDiodes')) hero.setActiveDiodes(state.activeDiodes);
    if (changes.any('cellTemperature')) hero.setCellTemperature(state.cellTemperature);
  }

  private applySignals(changes: StateChanges, state: AssemblyState): void {
    if (changes.any('wavelength')) this.sliceFlow.setWavelength(state.wavelength);
    if (changes.any('irradiance')) this.sliceFlow.setIrradiance(state.irradiance);
    if (changes.any('power')) this.applyPower(state.power);
  }

  private applyViews(changes: StateChanges, view: ViewOptions): void {
    if (changes.view('sun')) this.sun.setPathVisible(view.sun);
    if (changes.view('slice')) this.slice.object.visible = view.slice;
    if (changes.view('flow')) this.applyFlow(view.flow);
  }

  private applyTilt(tilt: number): void {
    this.array.setTilt(tilt);
    this.cables.setHeroPose(this.array.heroPivot.matrix);
    this.side = cutSide(tilt, CELL_VIEW_DIRECTION);
    this.slice.setCutSide(this.side);
    this.sliceFlow.setSide(this.side);
  }

  private applyFlow(shown: boolean): void {
    this.array.hero.setOverlayVisible(shown);
    this.cables.setFlowShown(shown);
    this.sliceFlow.setShown(shown);
  }

  private applyMinute(minute: number): void {
    const palette = skyPalette(minute);
    const [x, y, z] = sunDirection(minute);
    this.sky.setSky(palette, new Vector3(x, y, z));
    this.sun.setMinute(minute, palette);
    this.house.lights.setSunElevation(sunElevationDeg(minute));
  }

  private aimRays(state: AssemblyState): void {
    const pivot = this.array.heroPivot;
    pivot.updateMatrix();
    const targets = this.faceTargets.map((point) => point.clone().applyMatrix4(pivot.matrix));
    this.sun.aimRays(targets, state.minute);
  }

  private aimPhotons(state: AssemblyState): void {
    const [x, y, z] = sunDirection(state.minute);
    const toPanel = new Quaternion().copy(this.array.heroPivot.quaternion).invert();
    const local = new Vector3(x, y, z).applyQuaternion(toPanel);
    this.sliceFlow.setPath(photonPath([local.x, local.y, local.z], SLICE_FLOW.siliconIndex));
  }

  private applyPower(power: number): void {
    this.inverter.setPower(power);
    this.meter.setPower(power);
    this.cables.setPower(power);
  }

  private collectAnchors(): void {
    const hero = this.array.hero.anchors;
    const entries: [PartId, Object3D][] = [
      ['sun', this.sun.sun],
      ['roof', this.house.roof],
      ...(Object.entries(hero) as [PartId, Object3D][]),
      ...(Object.entries(this.slice.anchors) as [PartId, Object3D][]),
      ['inverter', this.inverter.anchor],
      ['meter', this.meter.anchor],
      ['dcCable', this.cables.anchors.dcCable],
      ['acCable', this.cables.anchors.acCable],
    ];
    entries.forEach(([id, anchor]) => this.anchors.set(id, anchor));
  }
}
