import { Group, Line, Mesh, Points, Sprite } from 'three';
import type { Box3, Material, Object3D } from 'three';
import { toRadians } from '@core/math';
import type { MaterialLibrary } from '@core/scene/materials';
import { anchorAt, isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import { ANCHOR_IDS, PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { ANCHOR_POINTS, SAW_GEOMETRY, SETTING_LAYOUT } from '../model';
import type { Assembly, AssemblyResources } from './assembly';
import { buildBackdrop } from './parts/backdrop';
import type { Backdrop } from './parts/backdrop';
import { buildBar } from './parts/bar';
import { buildClutch } from './parts/clutch';
import { namedGroup } from './parts/context';
import type { PartContext, Section } from './parts/context';
import { buildEngine } from './parts/engine';
import { buildFlow } from './parts/flow';
import { buildFuel } from './parts/fuel';
import { buildHousing } from './parts/housing';
import { buildStarter } from './parts/starter';
import { buildWood } from './parts/wood';
import { FOREST } from './constants';
import { regionBox } from './regions';

type Drawable = Mesh | Line | Points | Sprite;

function isDrawable(object: Object3D): object is Drawable {
  return (
    object instanceof Mesh ||
    object instanceof Line ||
    object instanceof Points ||
    object instanceof Sprite
  );
}

function completeLabels(found: ReadonlyMap<PartId, Object3D>): ReadonlyMap<PartId, Object3D> {
  return new Map(
    PART_IDS.map((id) => {
      const anchor = found.get(id);
      if (!anchor) throw new Error(`No label anchor for part ${id}`);
      return [id, anchor];
    }),
  );
}

class ChainsawAssembly implements Assembly {
  readonly root = new Group();
  private readonly pivot: Group;
  private readonly saw: Group;
  private readonly materials: MaterialLibrary;
  private readonly tracker = new ResourceTracker();
  private readonly sections: readonly Section[];
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly anchors: ReadonlyMap<AnchorId, Object3D>;
  private readonly backdrop: Backdrop;
  private lift = 0;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    this.root.name = 'chainsaw';
    const [pivotX, pivotY, pivotZ] = SAW_GEOMETRY.rearGrip;
    this.pivot = namedGroup('kickbackPivot', this.root);
    this.pivot.position.set(pivotX, pivotY, pivotZ);
    this.saw = namedGroup('saw', this.pivot);
    this.saw.position.set(-pivotX, -pivotY, -pivotZ);
    const context: PartContext = {
      materials: resources.materials,
      textures: resources.textures,
      tracker: this.tracker,
      labels: new Map(),
    };
    this.backdrop = buildBackdrop(context, this.root);
    const flow = buildFlow(context, this.saw);
    this.sections = [
      buildHousing(context, this.saw),
      buildEngine(context, this.saw, flow.glow),
      buildFuel(context, this.saw),
      buildClutch(context, this.saw),
      buildStarter(context, this.saw),
      buildBar(context, this.saw, flow.oil),
      flow,
      buildWood(context, this.root),
    ];
    this.labels = completeLabels(context.labels);
    this.anchors = new Map(ANCHOR_IDS.map((id) => [id, anchorAt(this.saw, ...ANCHOR_POINTS[id])]));
    this.setState(state);
    this.update(0);
  }

  setState(state: AssemblyState): void {
    this.lift = SETTING_LAYOUT[state.setting].lift;
    this.root.position.y = this.lift;
    this.pivot.rotation.z = toRadians(state.safety.riseDeg);
    this.backdrop.setState(state);
    this.sections.forEach((section) => section.setState(state));
  }

  update(deltaSeconds: number, cameraDistance: number = FOREST.closeFrom): boolean {
    this.backdrop.setCloseness(cameraDistance);
    return this.sections.map((section) => section.update?.(deltaSeconds) ?? false).some(Boolean);
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    const found = this.anchors.get(id);
    if (!found) throw new Error(`Missing anchor ${id}`);
    return found;
  }

  region(id: RegionId): Box3 {
    return regionBox(id, this.lift);
  }

  warmUp(compile: (object: Object3D) => void): void {
    const seen = new Set<Material | Material[]>();
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

export function createChainsawAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new ChainsawAssembly(resources, state);
}
