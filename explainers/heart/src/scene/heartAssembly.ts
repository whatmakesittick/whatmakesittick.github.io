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
} from '../model';
import type { Point } from '../model';
import type { Assembly, AssemblyResources } from './assembly';
import {
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
    this.root.add(this.myocardium.object, this.vessels.object, this.coronaries.object);
    this.buildAnchors();
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const changes = new StateChanges(this.state, state);
    this.state = snapshot(state);
    if (changes.any('time')) {
      const squeeze = ventricularSqueeze(state.time);
      const emptying = 1 - atrialFullness(state.time);
      this.myocardium.setContraction(squeeze, emptying);
      this.coronaries.setContraction(squeeze, emptying);
    }
    if (changes.view('cutaway')) {
      this.myocardium.setCutaway(state.view.cutaway);
      this.vessels.setCutaway(state.view.cutaway);
      this.coronaries.setCutaway(state.view.cutaway);
    }
  }

  update(): boolean {
    return false;
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
