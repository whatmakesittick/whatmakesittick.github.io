import { Box3, Group, Mesh, Points, Sprite } from 'three';
import type { Material, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { DRONE } from '../model/layout';
import { droneUnits } from '../model/scale';
import type { Assembly, AssemblyResources, ChaseTarget } from './assembly';
import { MOTOR, PLATE } from './constants';
import { bellFinish, carbonFinish } from './finishes';
import { slotTexture, weaveTexture } from './geometry/surfaceMaps';
import type { PartContext } from './parts/context';
import { DronePart } from './parts/drone/drone';
import { EffectsPart } from './parts/effects/effects';
import { createCrossing } from './parts/world/crossing';
import { createField } from './parts/world/field';
import { createLaunchPad } from './parts/world/pad';
import { createShrubs } from './parts/world/shrubs';
import { createSky } from './parts/world/sky';
import { createStation } from './parts/world/station';
import { createTreeline } from './parts/world/trees';
import { staticRegions } from './regions';

type Drawable = (Mesh | Points | Sprite) & { material: Material };

function isDrawable(object: Object3D): object is Drawable {
  const drawable = object instanceof Mesh || object instanceof Points || object instanceof Sprite;
  return drawable && !Array.isArray((object as Drawable).material);
}

function createContext(resources: AssemblyResources, tracker: ResourceTracker): PartContext {
  const weave = tracker.track(weaveTexture(PLATE.weave));
  weave.repeat.setScalar(1 / (PLATE.weave.tows * PLATE.weave.towMetres));
  const slots = tracker.track(slotTexture(MOTOR.slots));
  return { ...resources, tracker, looks: { carbon: carbonFinish(weave), bell: bellFinish(slots) } };
}

export class FpvAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly drone: DronePart;
  private readonly effects: EffectsPart;
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly named: Readonly<Record<AnchorId, Object3D>>;
  private readonly regions: Readonly<Record<RegionId, Box3>>;
  private chase: ChaseTarget = {
    position: [0, 0, 0],
    heading: 0,
    pitch: 0,
    roll: 0,
    span: droneUnits(DRONE.wheelbase),
  };
  private playing = false;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    const context = createContext(resources, this.tracker);
    const station = createStation(context);
    const pad = createLaunchPad(context);
    const crossing = createCrossing(context);
    this.drone = new DronePart(context);
    this.effects = new EffectsPart(context, {
      drone: this.drone,
      patchAntenna: station.patchAntenna,
      goggles: station.goggles,
    });
    this.root.add(
      createSky(context),
      createField(context),
      createTreeline(context),
      createShrubs(context),
      station.object,
      pad.object,
      crossing.object,
      this.drone.object,
      this.effects.object,
    );
    this.labels = new Map<PartId, Object3D>([
      ...this.drone.labels,
      ['groundStation', station.label],
      ['launchPad', pad.label],
      ['crossroads', crossing.anchor],
      ...this.effects.labels,
    ]);
    this.named = {
      drone: this.drone.object,
      camera: this.drone.cameraAnchor,
      station: station.label,
      crossroads: crossing.anchor,
    };
    this.regions = { ...staticRegions(), drone: new Box3() };
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const { position, heading, pitch, roll } = state.flight;
    this.playing = state.playing;
    this.chase = { ...this.chase, position, heading, pitch, roll };
    this.root.updateMatrixWorld();
    this.drone.setState(state);
    this.drone.worldBox(this.regions.drone);
    this.effects.setState(state);
  }

  update(deltaSeconds: number, _cameraDistance: number): boolean {
    if (!this.playing) return false;
    this.drone.advance(deltaSeconds);
    this.effects.advance(deltaSeconds);
    return true;
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
    return this.chase;
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

export function createFpvAssembly(resources: AssemblyResources, state: AssemblyState): Assembly {
  return new FpvAssembly(resources, state);
}
