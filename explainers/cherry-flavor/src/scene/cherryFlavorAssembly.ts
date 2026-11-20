import { Group, Line, Mesh, Points, Sprite } from 'three';
import type { Box3, Material, Object3D } from 'three';
import { lerp, smoothstep } from '@core/math';
import { anchorAt, isShown } from '@core/scene/parts';
import type { Steps } from '@core/scene/pacing';
import { ResourceTracker } from '@core/scene/resources';
import { ANCHOR_IDS, ANCHOR_SCALE, PART_IDS, SCALE_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId, ScaleId } from '../ids';
import { ANCHOR_POINTS } from '../model/layout';
import type { Assembly, AssemblyResources } from './assembly';
import { CROSSFADE } from './constants';
import type { PartContext, Section } from './parts/context';
import { buildHeadWorld } from './parts/head/headWorld';
import { buildMoleculeWorld } from './parts/molecules/moleculeWorld';
import { buildTongueWorld } from './parts/tongue/tongueWorld';
import { Veil } from './parts/veil';
import { regionBox } from './regions';

type Drawable = Mesh | Line | Points | Sprite;

const OUTGOING_GROWTH = 1.08;

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

interface Worlds {
  readonly context: PartContext;
  readonly roots: Readonly<Record<ScaleId, Group>>;
  readonly sections: Readonly<Record<ScaleId, Section>>;
  readonly veil: Veil;
}

function scaleRoot(root: Group, scale: ScaleId): Group {
  const group = new Group();
  group.name = `${scale}Scale`;
  root.add(group);
  return group;
}

function* buildWorlds(
  resources: AssemblyResources,
  root: Group,
  tracker: ResourceTracker,
): Steps<Worlds> {
  const context: PartContext = {
    materials: resources.materials,
    textures: resources.textures,
    tracker,
    labels: new Map(),
  };
  const roots = {
    head: scaleRoot(root, 'head'),
    tongue: scaleRoot(root, 'tongue'),
    molecules: scaleRoot(root, 'molecules'),
  };
  const head = buildHeadWorld(context, roots.head);
  yield;
  const tongue = buildTongueWorld(context, roots.tongue);
  yield;
  const molecules = buildMoleculeWorld(context, roots.molecules);
  yield;
  const veil = new Veil(context, root);
  return { context, roots, sections: { head, tongue, molecules }, veil };
}

class CherryFlavorAssembly implements Assembly {
  readonly root: Group;
  private readonly tracker: ResourceTracker;
  private readonly resources: AssemblyResources;
  private readonly worlds: Worlds;
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly anchors: ReadonlyMap<AnchorId, Object3D>;
  private target: ScaleId;
  private previous: ScaleId;
  private fade = 1;

  constructor(
    resources: AssemblyResources,
    root: Group,
    tracker: ResourceTracker,
    worlds: Worlds,
    state: AssemblyState,
  ) {
    this.resources = resources;
    this.root = root;
    this.tracker = tracker;
    this.worlds = worlds;
    this.labels = completeLabels(worlds.context.labels);
    this.anchors = new Map(
      ANCHOR_IDS.map((id) => [
        id,
        id === 'bite'
          ? (this.labels.get('bite') ?? root)
          : anchorAt(worlds.roots[ANCHOR_SCALE[id]], ...ANCHOR_POINTS[id]),
      ]),
    );
    this.target = state.scale;
    this.previous = state.scale;
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    if (state.scale !== this.target) {
      this.previous = this.fade >= CROSSFADE.swapAt ? this.target : this.previous;
      this.target = state.scale;
      this.fade = 0;
    }
    SCALE_IDS.forEach((scale) => this.worlds.sections[scale].setState(state));
    this.applyFade();
  }

  update(deltaSeconds: number): boolean {
    const fading = this.fade < 1;
    if (fading) this.fade = Math.min(1, this.fade + deltaSeconds / CROSSFADE.seconds);
    this.applyFade();
    const shown = this.worlds.sections[this.shownScale()];
    const moving = shown.update?.(deltaSeconds) ?? false;
    return fading || moving;
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

  private shownScale(): ScaleId {
    return this.fade >= CROSSFADE.swapAt ? this.target : this.previous;
  }

  private applyFade(): void {
    const shown = this.shownScale();
    const incoming = smoothstep(this.fade, CROSSFADE.swapAt, 1);
    const outgoing = smoothstep(this.fade, 0, CROSSFADE.swapAt);
    SCALE_IDS.forEach((scale) => {
      const root = this.worlds.roots[scale];
      root.visible = scale === shown;
      root.scale.setScalar(
        scale === this.target
          ? lerp(CROSSFADE.incomingScale, 1, incoming)
          : lerp(1, OUTGOING_GROWTH, outgoing),
      );
    });
    const veil = this.fade >= 1 ? 0 : CROSSFADE.veilPeak * Math.sin(Math.PI * this.fade);
    this.worlds.veil.show(veil);
  }
}

export function* createCherryFlavorAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Steps<Assembly> {
  const root = new Group();
  root.name = 'cherryFlavor';
  const tracker = new ResourceTracker();
  const worlds = yield* buildWorlds(resources, root, tracker);
  return new CherryFlavorAssembly(resources, root, tracker, worlds, state);
}
