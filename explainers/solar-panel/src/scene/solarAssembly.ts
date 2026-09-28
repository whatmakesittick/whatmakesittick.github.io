import { Group, Vector3 } from 'three';
import type { Box3, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, RegionId, ViewOptions } from '../ids';
import { MODULE, sunDirection } from '../model';
import type { Assembly, AssemblyResources } from './assembly';
import { RAYS } from './constants';
import { ArrayPart } from './parts/array/array';
import type { PartContext } from './parts/context';
import { InverterPart } from './parts/equipment/inverter';
import { MeterPart } from './parts/equipment/meter';
import { createHouse } from './parts/house/house';
import type { HousePart } from './parts/house/house';
import { skyPalette } from './parts/sky/palette';
import { SkyDomePart } from './parts/sky/skyDome';
import { SunPart } from './parts/sky/sun';
import { SliceBlockPart } from './parts/slice/sliceBlock';
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
  private readonly anchors = new Map<PartId, Object3D>();
  private readonly named: Record<AnchorId, Object3D>;
  private readonly faceTargets = rayTargets();
  private state: AssemblyState | null = null;

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
    this.array.heroPivot.add(this.slice.object);
    this.root.add(
      this.sky.mesh,
      this.house.object,
      this.array.object,
      this.sun.object,
      this.inverter.object,
      this.meter.object,
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
    const previous = this.state;
    this.state = snapshot(state);
    const changed = <K extends keyof AssemblyState>(key: K) =>
      !previous || previous[key] !== state[key];
    const viewChanged = (key: ViewKey) => !previous || previous.view[key] !== state.view[key];
    if (changed('tilt')) this.array.setTilt(state.tilt);
    if (changed('tilt') || changed('explode'))
      this.array.hero.setExplode(state.explode, state.tilt);
    if (changed('minute')) this.applyMinute(state.minute);
    if (changed('minute') || changed('tilt')) this.aimRays(state);
    if (changed('layout')) this.array.hero.setLayout(state.layout);
    if (changed('shade')) this.array.hero.setShade(state.shade);
    if (changed('layout') || !previous || !sameFlags(previous.deadStrings, state.deadStrings)) {
      this.array.hero.setDeadStrings(state.deadStrings);
    }
    if (changed('layout') || !previous || !sameFlags(previous.activeDiodes, state.activeDiodes)) {
      this.array.hero.setActiveDiodes(state.activeDiodes);
    }
    if (changed('cellTemperature')) this.array.hero.setCellTemperature(state.cellTemperature);
    if (changed('power')) this.applyPower(state.power);
    if (viewChanged('sun')) this.sun.setPathVisible(state.view.sun);
    if (viewChanged('slice')) this.slice.object.visible = state.view.slice;
    if (viewChanged('flow')) this.array.hero.setOverlayVisible(state.view.flow);
  }

  update(deltaSeconds: number, cameraDistance: number): void {
    this.sun.update(deltaSeconds);
    this.meter.update(deltaSeconds);
    void cameraDistance;
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
        return regionIn(sliceRegion(), this.slice.block.matrixWorld);
      case 'inverter':
        return regionIn(INVERTER_REGION, this.root.matrixWorld);
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.materials.clearRegistered();
    this.tracker.dispose();
  }

  private applyMinute(minute: number): void {
    const palette = skyPalette(minute);
    const [x, y, z] = sunDirection(minute);
    this.sky.setSky(palette, new Vector3(x, y, z));
    this.sun.setMinute(minute, palette);
  }

  private aimRays(state: AssemblyState): void {
    const pivot = this.array.heroPivot;
    pivot.updateMatrix();
    const targets = this.faceTargets.map((point) => point.clone().applyMatrix4(pivot.matrix));
    this.sun.aimRays(targets, state.minute);
  }

  private applyPower(power: number): void {
    this.inverter.setPower(power);
    this.meter.setPower(power);
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
      ['dcCable', this.inverter.anchor],
      ['acCable', this.meter.anchor],
    ];
    entries.forEach(([id, anchor]) => this.anchors.set(id, anchor));
  }
}
