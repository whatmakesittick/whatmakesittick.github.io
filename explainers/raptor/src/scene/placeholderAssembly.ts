import {
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry, Box3, Object3D } from 'three';
import { toRadians } from '@core/math';
import type { MaterialFinish } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import { ResourceTracker } from '@core/scene/resources';
import { PART_IDS, STREAM_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId, StreamId } from '../ids';
import {
  ACTUATORS,
  BOOSTER,
  BOOSTER_AXIS,
  CHAMBER,
  ENGINE_EXTENT,
  GIMBAL,
  HOT_GAS_MANIFOLD,
  INJECTOR,
  INLETS,
  NOZZLE_EXIT,
  PREBURNERS,
  STREAM_PATHS,
  THROAT,
  THRUST_MOUNT,
  TURBOPUMPS,
  clusterEngines,
  engineState,
  plumeShape,
  wallRadius,
} from '../model';
import type { Canister, Point, PumpSide } from '../model';
import { THEME } from '../theme';
import type { Assembly, AssemblyResources } from './assembly';

const SEGMENTS = 32;
const WALL_SAMPLES = 48;
const STREAM_TUBE_CM = 1.2;
const PLUME_START_RADIUS = NOZZLE_EXIT.radius * 0.95;
const ANCHOR_LIFT_CM = 4;
const PLUME_LABEL_DEPTH_CM = 400;
const BOOSTER_HEIGHT_CM = BOOSTER.skirtTop - BOOSTER.baseY;
const CLUSTER_ENGINE_HEIGHT_CM = 300;

const STEEL: MaterialFinish = { color: THEME.steel, roughness: 0.35, metalness: 0.9 };
const DARK_STEEL: MaterialFinish = { color: THEME.darkSteel, roughness: 0.45, metalness: 0.85 };
const HOT: MaterialFinish = {
  color: THEME.hotWall,
  emissive: THEME.hotWall,
  emissiveIntensity: 0.4,
  roughness: 0.4,
  metalness: 0.7,
};
const PLUME: MaterialFinish = {
  color: THEME.plume,
  emissive: THEME.flame,
  emissiveIntensity: 1,
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
};
const BOOSTER_FINISH: MaterialFinish = { color: THEME.booster, roughness: 0.4, metalness: 0.8 };

function streamFinish(id: StreamId): MaterialFinish {
  return { color: THEME[id], emissive: THEME[id], emissiveIntensity: 0.8, roughness: 0.5 };
}

const ANCHOR_POINTS: Readonly<Record<AnchorId, Point>> = {
  gimbal: GIMBAL.centre,
  oxygenPump: TURBOPUMPS.oxygen.centre,
  methanePump: TURBOPUMPS.methane.centre,
  oxygenPreburner: PREBURNERS.oxygen.centre,
  methanePreburner: PREBURNERS.methane.centre,
  injector: [0, INJECTOR.y, 0],
  chamber: [0, (CHAMBER.top + CHAMBER.bottom) / 2, 0],
  throat: [0, THROAT.y, 0],
  nozzleExit: [0, NOZZLE_EXIT.y, 0],
  plume: [0, NOZZLE_EXIT.y - PLUME_LABEL_DEPTH_CM, 0],
};

function streamPoint(id: StreamId): Point {
  const [path] = STREAM_PATHS[id];
  return path[Math.floor(path.length / 3)];
}

const LABEL_POINTS: Readonly<Record<PartId, Point>> = {
  gimbal: GIMBAL.centre,
  actuators: ACTUATORS[0].bottom,
  oxygenInlet: INLETS.oxygen.centre,
  methaneInlet: INLETS.methane.centre,
  oxygenPump: TURBOPUMPS.oxygen.centre,
  methanePump: TURBOPUMPS.methane.centre,
  oxygenPreburner: PREBURNERS.oxygen.centre,
  methanePreburner: PREBURNERS.methane.centre,
  hotGasManifold: [HOT_GAS_MANIFOLD.radius, HOT_GAS_MANIFOLD.y, 0],
  injector: [0, INJECTOR.y, 0],
  chamber: [CHAMBER.radius, (CHAMBER.top + CHAMBER.bottom) / 2, 0],
  throat: [THROAT.radius, THROAT.y, 0],
  coolingChannels: [wallRadius(-230), -230, 0],
  nozzle: [wallRadius(-260), -260, 0],
  plume: ANCHOR_POINTS.plume,
  shockDiamonds: [0, NOZZLE_EXIT.y - 180, 0],
  liquidOxygen: streamPoint('liquidOxygen'),
  liquidMethane: streamPoint('liquidMethane'),
  oxygenRichGas: streamPoint('oxygenRichGas'),
  methaneRichGas: streamPoint('methaneRichGas'),
  booster: [0, BOOSTER.baseY + 200, BOOSTER_AXIS.z + BOOSTER.radius],
};

const BOOSTER_REGION: RegionSpec = {
  x: [BOOSTER_AXIS.x - BOOSTER.radius, BOOSTER_AXIS.x + BOOSTER.radius],
  y: [-1100, BOOSTER.skirtTop],
  z: [BOOSTER_AXIS.z - BOOSTER.radius, BOOSTER_AXIS.z + BOOSTER.radius],
};

const REGIONS: Readonly<Record<RegionId, RegionSpec>> = {
  scene: { x: [-160, 160], y: [-1800, 16], z: [-160, 160] },
  engine: ENGINE_EXTENT,
  hero: { x: [-110, 110], y: [-810, 16], z: [-80, 80] },
  powerhead: { x: [-80, 80], y: [-100, 16], z: [-40, 40] },
  turbopumps: { x: [-78, 76], y: [-92, -24], z: [-20, 20] },
  chamber: { x: [-30, 30], y: [-165, -88], z: [-25, 25] },
  nozzle: { x: [-70, 70], y: [-312, -150], z: [-70, 70] },
  nozzleAndPlume: { x: [-160, 160], y: [-1800, -150], z: [-160, 160] },
  booster: BOOSTER_REGION,
};

function wallProfile(): Vector2[] {
  return Array.from({ length: WALL_SAMPLES + 1 }, (_, index) => {
    const y = INJECTOR.y + ((NOZZLE_EXIT.y - INJECTOR.y) * index) / WALL_SAMPLES;
    return new Vector2(wallRadius(y), y);
  });
}

function toVector([x, y, z]: Point): Vector3 {
  return new Vector3(x, y, z);
}

export class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly engine = new Group();
  private readonly streams = new Group();
  private readonly cluster = new Group();
  private readonly resources: AssemblyResources;
  private readonly tracker = new ResourceTracker();
  private readonly anchors = new Map<AnchorId, Object3D>();
  private readonly labels = new Map<PartId, Object3D>();
  private plume!: Mesh;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.resources = resources;
    this.root.add(this.engine, this.cluster);
    this.engine.add(this.streams);
    this.buildMount();
    this.buildPowerhead();
    this.buildThrustChamber();
    this.buildStreams();
    this.buildPlume();
    this.buildCluster();
    this.buildAnchors();
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const engine = engineState(state.phase);
    const shape = plumeShape(engine.throttle, engine.airPressurePa);
    this.engine.rotation.set(toRadians(engine.gimbal.pitch), 0, toRadians(engine.gimbal.yaw));
    this.plume.visible = state.view.flame && shape.length > 0;
    const spread = Math.tan(toRadians(shape.spreadDeg)) * shape.length;
    this.plume.scale.set(
      (PLUME_START_RADIUS * shape.waist + spread) / PLUME_START_RADIUS,
      Math.max(shape.length, 1),
      (PLUME_START_RADIUS * shape.waist + spread) / PLUME_START_RADIUS,
    );
    this.streams.visible = state.view.flow;
    this.cluster.visible = state.view.cluster;
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
    this.resources.materials.clearRegistered();
    this.tracker.dispose();
    this.root.removeFromParent();
  }

  private mesh(
    geometry: BufferGeometry,
    group: string,
    finish: MaterialFinish,
    parent: Group = this.engine,
  ): Mesh {
    const mesh = new Mesh(
      this.tracker.track(geometry),
      this.resources.materials.get(group, finish),
    );
    parent.add(mesh);
    return mesh;
  }

  private canister(canister: Canister, group: PartId, finish: MaterialFinish): void {
    const height = canister.top - canister.bottom;
    const geometry = new CylinderGeometry(canister.radius, canister.radius, height, SEGMENTS);
    const mesh = this.mesh(geometry, group, finish);
    mesh.position.set(canister.centre[0], (canister.top + canister.bottom) / 2, canister.centre[2]);
  }

  private buildMount(): void {
    const height = THRUST_MOUNT.top - THRUST_MOUNT.bottom;
    const plate = this.mesh(
      new CylinderGeometry(THRUST_MOUNT.radius, THRUST_MOUNT.radius, height, SEGMENTS),
      'gimbal',
      DARK_STEEL,
      this.root as Group,
    );
    plate.position.y = THRUST_MOUNT.bottom + height / 2;
    this.mesh(new SphereGeometry(GIMBAL.radius, SEGMENTS, SEGMENTS / 2), 'gimbal', STEEL);
    for (const { top, bottom } of ACTUATORS) {
      const curve = new CatmullRomCurve3([toVector(top), toVector(bottom)]);
      this.mesh(new TubeGeometry(curve, 2, 3, 12), 'actuators', DARK_STEEL);
    }
  }

  private buildPowerhead(): void {
    const sides: readonly PumpSide[] = ['oxygen', 'methane'];
    for (const side of sides) {
      this.canister(TURBOPUMPS[side], side === 'oxygen' ? 'oxygenPump' : 'methanePump', STEEL);
      this.canister(
        PREBURNERS[side],
        side === 'oxygen' ? 'oxygenPreburner' : 'methanePreburner',
        DARK_STEEL,
      );
      const inlet = INLETS[side];
      const pipe = this.mesh(
        new CylinderGeometry(inlet.radius, inlet.radius, THRUST_MOUNT.top - inlet.centre[1], 16),
        side === 'oxygen' ? 'oxygenInlet' : 'methaneInlet',
        STEEL,
      );
      pipe.position.set(inlet.centre[0], (THRUST_MOUNT.top + inlet.centre[1]) / 2, inlet.centre[2]);
    }
    const manifold = this.mesh(
      new TorusGeometry(HOT_GAS_MANIFOLD.radius, HOT_GAS_MANIFOLD.tube, 12, SEGMENTS),
      'hotGasManifold',
      DARK_STEEL,
    );
    manifold.rotation.x = Math.PI / 2;
    manifold.position.y = HOT_GAS_MANIFOLD.y;
    const injector = this.mesh(
      new CylinderGeometry(INJECTOR.radius, INJECTOR.radius, 3, SEGMENTS),
      'injector',
      HOT,
    );
    injector.position.y = INJECTOR.y;
  }

  private buildThrustChamber(): void {
    const profile = wallProfile();
    const chamberEnd = profile.findIndex((point) => point.y <= THROAT.y);
    this.mesh(new LatheGeometry(profile.slice(0, chamberEnd + 1), SEGMENTS), 'chamber', HOT);
    this.mesh(new LatheGeometry(profile.slice(chamberEnd), SEGMENTS), 'nozzle', {
      ...STEEL,
      side: DoubleSide,
    });
  }

  private buildStreams(): void {
    for (const id of STREAM_IDS) {
      for (const path of STREAM_PATHS[id]) {
        const curve = new CatmullRomCurve3(path.map(toVector));
        const geometry = new TubeGeometry(curve, path.length * 8, STREAM_TUBE_CM, 6);
        this.mesh(geometry, id, streamFinish(id), this.streams);
      }
    }
  }

  private buildPlume(): void {
    const geometry = new ConeGeometry(PLUME_START_RADIUS, 1, SEGMENTS, 1, true);
    geometry.rotateX(Math.PI);
    geometry.translate(0, -0.5, 0);
    this.plume = this.mesh(geometry, 'plume', PLUME);
    this.plume.position.y = NOZZLE_EXIT.y;
  }

  private buildCluster(): void {
    const skirt = this.mesh(
      new CylinderGeometry(BOOSTER.radius, BOOSTER.radius, BOOSTER_HEIGHT_CM, 64, 1, true),
      'booster',
      { ...BOOSTER_FINISH, side: DoubleSide },
      this.cluster,
    );
    skirt.position.set(BOOSTER_AXIS.x, BOOSTER.baseY + BOOSTER_HEIGHT_CM / 2, BOOSTER_AXIS.z);
    const engineGeometry = this.tracker.track(
      new ConeGeometry(NOZZLE_EXIT.radius, CLUSTER_ENGINE_HEIGHT_CM, 24, 1, true),
    );
    const material = this.resources.materials.get('booster', STEEL);
    for (const engine of clusterEngines().filter((candidate) => !candidate.isModelEngine)) {
      const copy = new Mesh(engineGeometry, material);
      copy.position.set(engine.position[0], -CLUSTER_ENGINE_HEIGHT_CM / 2, engine.position[2]);
      this.cluster.add(copy);
    }
  }

  private buildAnchors(): void {
    for (const id of Object.keys(ANCHOR_POINTS) as AnchorId[]) {
      const [x, y, z] = ANCHOR_POINTS[id];
      this.anchors.set(id, anchorAt(this.engine, x, y, z));
    }
    for (const id of PART_IDS) {
      const [x, y, z] = LABEL_POINTS[id];
      const parent = id === 'booster' ? this.cluster : this.engine;
      this.labels.set(id, anchorAt(parent, x, y, z + ANCHOR_LIFT_CM));
    }
  }
}
