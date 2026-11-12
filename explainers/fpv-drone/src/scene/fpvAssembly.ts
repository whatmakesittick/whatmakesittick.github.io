import { Box3, Group, Mesh, Points, Sprite } from 'three';
import type { Material, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { runPaced } from '@core/scene/pacing';
import type { Steps } from '@core/scene/pacing';
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
import type { CrossingPart } from './parts/world/crossing';
import { createField } from './parts/world/field';
import { createLaunchPad } from './parts/world/pad';
import type { PadPart } from './parts/world/pad';
import { createShrubs } from './parts/world/shrubs';
import { createSky } from './parts/world/sky';
import { createStation } from './parts/world/station';
import type { StationPart } from './parts/world/station';
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

interface Parts {
  tracker: ResourceTracker;
  station: StationPart;
  pad: PadPart;
  crossing: CrossingPart;
  drone: DronePart;
  effects: EffectsPart;
  sky: Mesh;
  field: Group;
  treeline: Group;
  shrubs: Points;
}

export function* buildParts(resources: AssemblyResources): Steps<Parts> {
  const tracker = new ResourceTracker();
  const context = createContext(resources, tracker);
  yield;
  const station = createStation(context);
  yield;
  const pad = createLaunchPad(context);
  const crossing = createCrossing(context);
  yield;
  const drone = new DronePart(context);
  yield;
  const effects = new EffectsPart(context, {
    drone,
    patchAntenna: station.patchAntenna,
    goggles: station.goggles,
  });
  yield;
  const sky = createSky(context);
  yield;
  const field = yield* createField(context);
  yield;
  const treeline = createTreeline(context);
  yield;
  const shrubs = createShrubs(context);
  return { tracker, station, pad, crossing, drone, effects, sky, field, treeline, shrubs };
}

export class FpvAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker: ResourceTracker;
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

  constructor(resources: AssemblyResources, parts: Parts, state: AssemblyState) {
    this.materials = resources.materials;
    const { station, pad, crossing } = parts;
    this.tracker = parts.tracker;
    this.drone = parts.drone;
    this.effects = parts.effects;
    this.root.add(
      parts.sky,
      parts.field,
      parts.treeline,
      parts.shrubs,
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

export async function createFpvAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Promise<Assembly> {
  return new FpvAssembly(resources, await runPaced(buildParts(resources)), state);
}
