import { Group, Line, Mesh, Points, Sprite } from 'three';
import type { Box3, Material, Object3D } from 'three';
import { anchorAt, isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import { ANCHOR_IDS, ANCHOR_SCALE, PART_IDS, SCALE_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId, ScaleId } from '../ids';
import { ANCHOR_POINTS, SCALE_ORIGIN } from '../model';
import type { Assembly, AssemblyResources } from './assembly';
import { CROSSFADE } from './constants';
import { buildBeakerWorld } from './parts/beaker/beakerWorld';
import type { PartContext, Section } from './parts/context';
import { DiveVeil, diveLook } from './parts/dive';
import { buildMoleculeWorld } from './parts/molecules/moleculeWorld';
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

class IodineClockAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly resources: AssemblyResources;
  private readonly roots: Readonly<Record<ScaleId, Group>>;
  private readonly worlds: Readonly<Record<ScaleId, Section>>;
  private readonly veil: DiveVeil;
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly anchors: ReadonlyMap<AnchorId, Object3D>;
  private target: ScaleId;
  private fade = 1;
  private depth = 0;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.resources = resources;
    this.root.name = 'iodineClock';
    const context: PartContext = {
      materials: resources.materials,
      textures: resources.textures,
      tracker: this.tracker,
      labels: new Map(),
    };
    const scaleRoot = (scale: ScaleId) => {
      const group = new Group();
      group.name = `${scale}Scale`;
      group.position.set(...SCALE_ORIGIN[scale]);
      this.root.add(group);
      return group;
    };
    this.roots = { beaker: scaleRoot('beaker'), molecules: scaleRoot('molecules') };
    this.worlds = {
      beaker: buildBeakerWorld(context, this.roots.beaker),
      molecules: buildMoleculeWorld(context, this.roots.molecules),
    };
    this.veil = new DiveVeil(context, this.root);
    this.labels = completeLabels(context.labels);
    this.anchors = new Map(
      ANCHOR_IDS.map((id) => [id, anchorAt(this.roots[ANCHOR_SCALE[id]], ...ANCHOR_POINTS[id])]),
    );
    this.target = state.scale;
    this.setState(state);
    this.applyDive();
  }

  setState(state: AssemblyState): void {
    if (state.scale !== this.target) {
      this.target = state.scale;
      this.fade = 1 - this.fade;
    }
    this.depth = state.clock.colour;
    SCALE_IDS.forEach((scale) => this.worlds[scale].setState(state));
    this.applyDive();
  }

  update(deltaSeconds: number): boolean {
    if (this.fade >= 1) return false;
    this.fade = Math.min(1, this.fade + deltaSeconds / CROSSFADE.seconds);
    this.applyDive();
    return true;
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
    return regionBox(id);
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
    this.resources.materials.clearRegistered();
    this.tracker.dispose();
  }

  private applyDive(): void {
    const look = diveLook(this.target, this.fade);
    const [focusX, focusY, focusZ] = CROSSFADE.focus;
    const beaker = this.roots.beaker;
    beaker.scale.setScalar(look.beakerScale);
    beaker.position.set(
      focusX * (1 - look.beakerScale),
      focusY * (1 - look.beakerScale),
      focusZ * (1 - look.beakerScale),
    );
    this.roots.molecules.scale.setScalar(look.moleculeScale);
    SCALE_IDS.forEach((scale) => (this.roots[scale].visible = look.shown === scale));
    this.veil.show(this.target, this.fade, this.depth, this.fade >= 1 ? 0 : look.veil);
    this.worlds.beaker.refresh?.();
  }
}

export function createIodineClockAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new IodineClockAssembly(resources, state);
}
