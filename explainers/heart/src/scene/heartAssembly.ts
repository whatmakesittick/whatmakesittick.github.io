import { Group } from 'three';
import type { Box3, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { regionFromSpec } from '@core/scene/regions';
import { ResourceTracker } from '@core/scene/resources';
import { PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId, ViewOptions } from '../ids';
import {
  APEX,
  AV_NODE,
  CHAMBERS,
  SINUS_NODE,
  VALVES,
  atrialFullness,
  ventricularSqueeze,
  wrapTime,
} from '../model';
import type { Point } from '../model';
import type { Assembly, AssemblyResources } from './assembly';
import {
  BLOOD,
  CAVITY_CONTRACTION,
  CONTRACTION_FRAME,
  CORONARIES,
  EPICARDIUM,
  OUTER_CONTRACTION,
  PORTAL_FADE_MM,
  PULMONARY_RING,
  SHAPE_SPEC,
} from './constants';
import { contraction } from './geometry/contraction';
import type { Contraction, ContractionProfile } from './geometry/contraction';
import { pinnedNear } from './geometry/portal';
import type { Portal } from './geometry/vesselPath';
import { heartShapes } from './geometry/heartShape';
import type { PartContext } from './parts/context';
import { CoronariesPart, coronaryRoutes } from './parts/heart/coronaries';
import { MyocardiumPart } from './parts/heart/myocardium';
import { epicardiumPainter } from './geometry/epicardium';
import { VesselsPart } from './parts/vessels/vessels';
import { ValvesPart } from './parts/valves/valves';
import { BloodFlowPart } from './parts/blood/bloodFlow';
import { REGIONS } from './regions';

const ANCHOR_LIFT_MM = 3;

type ViewKey = keyof ViewOptions;

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

  view(key: ViewKey): boolean {
    return !this.previous || this.previous.view[key] !== this.next.view[key];
  }
}

function snapshot(state: AssemblyState): AssemblyState {
  return { ...state, view: { ...state.view } };
}

const ANCHOR_POINTS: Readonly<Record<AnchorId, Point>> = {
  apex: APEX,
  tricuspid: VALVES.tricuspid.centre,
  pulmonary: PULMONARY_RING,
  mitral: VALVES.mitral.centre,
  aortic: VALVES.aortic.centre,
  sinusNode: SINUS_NODE.centre,
  avNode: AV_NODE,
  rightAtrium: CHAMBERS.rightAtrium.centre,
  rightVentricle: CHAMBERS.rightVentricle.centre,
  leftAtrium: CHAMBERS.leftAtrium.centre,
  leftVentricle: CHAMBERS.leftVentricle.centre,
};

function pinnedMotion(profile: ContractionProfile, portals: readonly Portal[]): Contraction {
  const free = contraction(CONTRACTION_FRAME, profile);
  return {
    squeeze: pinnedNear(free.squeeze, portals, PORTAL_FADE_MM),
    emptying: pinnedNear(free.emptying, portals, PORTAL_FADE_MM),
  };
}

export class HeartAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly myocardium: MyocardiumPart;
  private readonly vessels: VesselsPart;
  private readonly coronaries: CoronariesPart;
  private readonly valves: ValvesPart;
  private readonly blood: BloodFlowPart;
  private readonly anchors = new Map<AnchorId, Object3D>();
  private readonly labels = new Map<PartId, Object3D>();
  private state: AssemblyState | null = null;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    const context: PartContext = { ...resources, tracker: this.tracker };
    const shapes = heartShapes(SHAPE_SPEC);
    const motion = {
      outer: pinnedMotion(OUTER_CONTRACTION, shapes.portals),
      cavity: pinnedMotion(CAVITY_CONTRACTION, shapes.portals),
    };
    const routes = coronaryRoutes(shapes.envelope, CORONARIES);
    const vessels = routes
      .filter((_, index) => CORONARIES[index].groove)
      .map((route) => ({ points: route.points, radius: route.radius[0] }));
    this.myocardium = new MyocardiumPart(
      context,
      shapes,
      motion,
      epicardiumPainter(shapes.envelope, vessels, EPICARDIUM),
    );
    this.vessels = new VesselsPart(context);
    this.coronaries = new CoronariesPart(context, routes, motion.outer);
    this.valves = new ValvesPart(context, shapes.sides, motion.cavity);
    this.blood = new BloodFlowPart(context, motion.cavity);
    this.root.add(
      this.myocardium.object,
      this.vessels.object,
      this.coronaries.object,
      this.valves.object,
      this.blood.object,
    );
    this.buildAnchors();
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const previous = this.state;
    const changes = new StateChanges(previous, state);
    this.state = snapshot(state);
    const squeeze = ventricularSqueeze(state.time);
    const emptying = 1 - atrialFullness(state.time);
    if (changes.any('time')) {
      this.myocardium.setContraction(squeeze, emptying);
      this.coronaries.setContraction(squeeze, emptying);
      this.valves.setTime(state.time, squeeze, emptying);
      if (previous) this.advanceBlood(previous.time, state.time);
    }
    if (changes.view('cutaway')) {
      this.myocardium.setCutaway(state.view.cutaway);
      this.vessels.setCutaway(state.view.cutaway);
      this.coronaries.setCutaway(state.view.cutaway);
    }
    if (changes.view('flow')) this.blood.setShown(state.view.flow);
    if (changes.view('flow') || changes.view('cutaway')) {
      this.vessels.setGlass(state.view.flow && !state.view.cutaway);
    }
    if (
      state.view.flow &&
      (changes.any('time') || changes.view('flow') || changes.view('cutaway'))
    ) {
      this.blood.place(state.time, squeeze, emptying, state.view.cutaway);
    }
  }

  update(_deltaSeconds: number, cameraDistance: number): boolean {
    this.blood.setCameraDistance(cameraDistance);
    return false;
  }

  private advanceBlood(from: number, to: number): void {
    const elapsed = wrapTime(to - from);
    if (elapsed > 0 && elapsed <= BLOOD.maxStepMs) this.blood.advance(elapsed, to);
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    const anchor = this.anchors.get(id);
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

  private buildAnchors(): void {
    for (const id of Object.keys(ANCHOR_POINTS) as AnchorId[]) {
      const [x, y, z] = ANCHOR_POINTS[id];
      this.anchors.set(id, anchorAt(this.root, x, y, z));
    }
    for (const id of PART_IDS) {
      const [x, y, z] = CHAMBERS.leftVentricle.centre;
      this.labels.set(id, anchorAt(this.root, x, y, z + ANCHOR_LIFT_MM));
    }
  }
}
