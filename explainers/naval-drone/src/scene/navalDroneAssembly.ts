import { Box3, Group, HemisphereLight, Mesh, Points, Sprite } from 'three';
import type { Material, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { PART_IDS } from '../ids';
import { BOAT } from '../model/layout';
import { SHIP_CENTRE } from '../model/run';
import type { Assembly, AssemblyResources, ChaseTarget } from './assembly';
import { LIGHT_RIG, SURFACE_MAPS } from './constants';
import { createBoatLooks } from './finishes';
import { BoatPart } from './parts/boat/boat';
import type { PartContext } from './parts/context';
import { cellTexture, deckTexture, hullSideTexture, noiseTexture } from './parts/surfaces';
import { resetWater } from './parts/water/waves';
import { boatRegion, staticRegions } from './regions';

type Drawable = (Mesh | Points | Sprite) & { material: Material };

function isDrawable(object: Object3D): object is Drawable {
  const drawable = object instanceof Mesh || object instanceof Points || object instanceof Sprite;
  return drawable && !Array.isArray((object as Drawable).material);
}

function createContext(resources: AssemblyResources, tracker: ResourceTracker): PartContext {
  const { size, low, high, seed, repeat } = SURFACE_MAPS.grain;
  const grain = tracker.track(noiseTexture(size, low, high, seed));
  grain.repeat.set(...repeat);
  const looks = createBoatLooks({
    side: tracker.track(hullSideTexture()),
    deck: tracker.track(deckTexture()),
    cells: tracker.track(cellTexture()),
    grain,
  });
  return { ...resources, tracker, looks };
}

export class NavalDroneAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly boat: BoatPart;
  private readonly labels = new Map<PartId, Object3D>();
  private readonly named: Readonly<Record<AnchorId, Object3D>>;
  private readonly regions: Readonly<Record<RegionId, Box3>>;
  private state: AssemblyState;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    this.state = state;
    resetWater(state.sea.waveHeight);
    const context = createContext(resources, this.tracker);
    const { sky } = LIGHT_RIG;
    this.boat = new BoatPart(context);
    this.root.add(new HemisphereLight(sky.color, sky.ground, sky.intensity), this.boat.object);
    PART_IDS.forEach((id) => this.labels.set(id, this.boat.object));
    this.named = {
      boat: this.boat.object,
      dome: this.boat.deck.domeLens,
      stern: this.boat.object,
      ship: this.boat.object,
      satellite: this.boat.object,
      backupSatellite: this.boat.object,
      groundStation: this.boat.object,
    };
    this.regions = { ...staticRegions(), boat: new Box3() };
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    this.state = state;
    this.boat.setState(state);
    boatRegion(this.boat.object, this.regions.boat);
  }

  update(_deltaSeconds: number, _cameraDistance: number): boolean {
    return this.state.playing || this.state.boat.held;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    return this.named[id];
  }

  region(id: RegionId): Box3 {
    return this.regions[id];
  }

  chaseTarget(): ChaseTarget {
    const { boat, planing } = this.state;
    const [x, y, z] = boat.position;
    return {
      position: [x, y + planing.heave, z],
      heading: boat.heading,
      length: BOAT.length,
      ship: SHIP_CENTRE,
    };
  }

  warmUp(compile: (object: Object3D) => void): void {
    const seen = new Set<Material>();
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

export function createNavalDroneAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new NavalDroneAssembly(resources, state);
}
