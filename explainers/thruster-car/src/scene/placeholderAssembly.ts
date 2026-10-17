import {
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Group,
  Mesh,
  PlaneGeometry,
  Vector3,
} from 'three';
import type { Box3, Material, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { localRegions, regionFromSpec } from '@core/scene/regions';
import { CAR_ANCHOR_IDS, CAR_REGION_IDS, NOZZLE_IDS, NOZZLE_PARTS, PART_IDS } from '../ids';
import type {
  AnchorId,
  AssemblyState,
  CarRegionId,
  ChaseTarget,
  NozzleId,
  PartId,
  Point,
  RegionId,
  SiteAnchorId,
} from '../ids';
import {
  CAR,
  CAR_ANCHORS,
  CAR_REGIONS,
  MOMENTS,
  NOZZLES,
  RAMP,
  SEAT,
  SITE,
  SITE_ANCHORS,
  SITE_REGIONS,
  TANK,
  TANK_VALVE,
  carAt,
  rampPitch,
  rampPoint,
  rampRoll,
} from '../model';
import { THEME } from '../theme';
import type { Assembly, AssemblyResources } from './assembly';
import { CAR_EULER_ORDER, applyCarPose } from './pose';

const RAMP_SECTIONS = 48;
const NOZZLE_RADIUS = 0.07;
const NOZZLE_LENGTH = 0.18;
const WHEEL_WIDTH = 0.25;
const WHEEL_INSET = 0.15;
const PAINT_THICKNESS = 0.01;
const RUNWAY_DEPTH = 0.02;
const GROUND_DROP = 0.03;
const FAN_GLOW_DEPTH = 0.04;
const VALVE_HALF = 0.08;
const SEAT_HALF: Point = [0.3, 0.35, 0.25];
const FORCE_LABEL_HEIGHT = 1.6;
const JETS_LABEL_GAP = 0.8;
const RUNWAY_LABEL: Point = [12, 0, -4];

const BODY_TOP = CAR.height - CAR.rideHeight;
const WHEEL_CENTRE_Y = CAR.wheelRadius - CAR.rideHeight;
const UP = new Vector3(0, 1, 0);
const ACROSS = new Vector3(0, 0, 1);

const FINISHES = {
  body: { color: THEME.carBody, roughness: 0.45, metalness: 0.6 },
  tyre: { color: THEME.tyre, roughness: 0.9, metalness: 0 },
  seat: { color: THEME.carTrim, roughness: 0.8, metalness: 0 },
  tank: { color: THEME.tankShell, roughness: 0.5, metalness: 0.2 },
  nozzle: { color: THEME.nozzleBody, roughness: 0.4, metalness: 0.7 },
  firing: { color: THEME.plumeAir, emissive: THEME.plumeAir, emissiveIntensity: 1.5 },
  fans: { color: THEME.fanGlow, emissive: THEME.fanGlow, emissiveIntensity: 1 },
  ramp: { color: THEME.rampSteel, roughness: 0.6, metalness: 0.5, side: DoubleSide },
  runway: { color: THEME.concrete, roughness: 0.95, metalness: 0 },
  paint: { color: THEME.paint, roughness: 0.8, metalness: 0 },
  ground: { color: THEME.scrub, roughness: 1, metalness: 0 },
} as const satisfies Record<string, MaterialFinish>;

const CAR_LABEL_SPOTS: Readonly<Partial<Record<PartId, Point>>> = {
  body: [0, BODY_TOP, 0],
  wheels: [CAR.wheelbase / 2, WHEEL_CENTRE_Y, CAR.width / 2],
  seat: SEAT,
  tank: TANK.centre,
  tankValve: TANK_VALVE,
  cornerNozzles: NOZZLES.cornerFrontRight.at,
  frontNozzles: NOZZLES.frontLeft.at,
  rearNozzles: NOZZLES.rearInnerRight.at,
  jets: [NOZZLES.rearInnerRight.at[0] - JETS_LABEL_GAP, NOZZLES.rearInnerRight.at[1], 0],
  forceArrows: [0, FORCE_LABEL_HEIGHT, 0],
  fans: [0, -FAN_GLOW_DEPTH, 0],
};

const SITE_LABEL_SPOTS: Readonly<Partial<Record<PartId, Point>>> = {
  runway: RUNWAY_LABEL,
  ramp: rampPoint(0.5),
  landingPad: SITE_ANCHORS.pad,
  ghostPath: carAt(MOMENTS.peak).position,
};

const carRegion = localRegions(CAR_REGIONS);

function isCarRegion(id: RegionId): id is CarRegionId {
  return (CAR_REGION_IDS as readonly RegionId[]).includes(id);
}

function centredBox([x, y, z]: Point, [halfX, halfY, halfZ]: Point): BufferGeometry {
  return box({
    minX: x - halfX,
    maxX: x + halfX,
    minY: y - halfY,
    maxY: y + halfY,
    minZ: z - halfZ,
    maxZ: z + halfZ,
  });
}

function ribbonGeometry(): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const side = new Vector3();
  for (let section = 0; section <= RAMP_SECTIONS; section += 1) {
    const u = section / RAMP_SECTIONS;
    const centre = new Vector3(...rampPoint(u));
    side
      .copy(ACROSS)
      .applyEuler(new Euler(rampRoll(u), 0, rampPitch(u), CAR_EULER_ORDER))
      .multiplyScalar(RAMP.width / 2);
    positions.push(...centre.clone().sub(side).toArray(), ...centre.clone().add(side).toArray());
    if (section > 0) {
      const base = 2 * (section - 1);
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly site = new Group();
  private readonly car = new Group();
  private readonly nozzles = new Map<NozzleId, { mesh: Mesh; idle: Material }>();
  private readonly labels = new Map<PartId, Object3D>();
  private readonly anchors = new Map<AnchorId, Object3D>();
  private readonly geometries: BufferGeometry[] = [];
  private readonly firing: Material;
  private readonly fanGlow: Mesh;
  private chase: ChaseTarget = { position: [0, 0, 0], heading: 0, pitch: 0, roll: 0, span: 0 };

  private readonly resources: AssemblyResources;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.resources = resources;
    this.root.add(this.site, this.car);
    this.firing = resources.materials.get('jets', FINISHES.firing);
    this.buildSite();
    this.buildCar();
    this.fanGlow = this.mesh(
      this.car,
      'fans',
      FINISHES.fans,
      box({
        minX: -CAR.length / 3,
        maxX: CAR.length / 3,
        minY: -FAN_GLOW_DEPTH,
        maxY: 0,
        minZ: -CAR.width / 3,
        maxZ: CAR.width / 3,
      }),
    );
    this.addLabels();
    CAR_ANCHOR_IDS.forEach((id) => this.anchors.set(id, anchorAt(this.car, ...CAR_ANCHORS[id])));
    (Object.keys(SITE_ANCHORS) as SiteAnchorId[]).forEach((id) =>
      this.anchors.set(id, anchorAt(this.site, ...SITE_ANCHORS[id])),
    );
    this.setState(state);
  }

  private mesh(
    parent: Object3D,
    group: string,
    finish: MaterialFinish,
    geometry: BufferGeometry,
  ): Mesh {
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, this.resources.materials.get(group, finish));
    parent.add(mesh);
    return mesh;
  }

  private buildSite(): void {
    const ground = this.mesh(
      this.site,
      UNDIMMED_GROUP,
      FINISHES.ground,
      new PlaneGeometry(SITE.groundSize, SITE.groundSize),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -GROUND_DROP;
    const { run, landingBox } = SITE;
    this.mesh(
      this.site,
      'runway',
      FINISHES.runway,
      box({
        minX: run.x[0],
        maxX: run.x[1],
        minY: -RUNWAY_DEPTH,
        maxY: 0,
        minZ: run.z[0],
        maxZ: run.z[1],
      }),
    );
    this.mesh(
      this.site,
      'landingPad',
      FINISHES.paint,
      box({
        minX: landingBox.x[0],
        maxX: landingBox.x[1],
        minY: 0,
        maxY: PAINT_THICKNESS,
        minZ: landingBox.z[0],
        maxZ: landingBox.z[1],
      }),
    );
    this.mesh(this.site, 'ramp', FINISHES.ramp, ribbonGeometry());
  }

  private buildCar(): void {
    this.mesh(
      this.car,
      'body',
      FINISHES.body,
      box({
        minX: -CAR.length / 2,
        maxX: CAR.length / 2,
        minY: 0,
        maxY: BODY_TOP,
        minZ: -CAR.width / 2,
        maxZ: CAR.width / 2,
      }),
    );
    [-1, 1].forEach((front) =>
      [-1, 1].forEach((right) => {
        const geometry = new CylinderGeometry(CAR.wheelRadius, CAR.wheelRadius, WHEEL_WIDTH);
        const wheel = this.mesh(this.car, 'wheels', FINISHES.tyre, geometry);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(
          (front * CAR.wheelbase) / 2,
          WHEEL_CENTRE_Y,
          right * (CAR.width / 2 - WHEEL_INSET),
        );
      }),
    );
    this.mesh(this.car, 'seat', FINISHES.seat, centredBox(SEAT, SEAT_HALF));
    const tank = this.mesh(
      this.car,
      'tank',
      FINISHES.tank,
      new CylinderGeometry(TANK.radius, TANK.radius, TANK.length),
    );
    tank.rotation.z = Math.PI / 2;
    tank.position.set(...TANK.centre);
    this.mesh(
      this.car,
      'tankValve',
      FINISHES.nozzle,
      centredBox(TANK_VALVE, [VALVE_HALF, VALVE_HALF, VALVE_HALF]),
    );
    NOZZLE_IDS.forEach((id) => this.addNozzle(id));
  }

  private addNozzle(id: NozzleId): void {
    const { at, dir } = NOZZLES[id];
    const geometry = new CylinderGeometry(NOZZLE_RADIUS, NOZZLE_RADIUS, NOZZLE_LENGTH);
    const group = NOZZLE_PARTS[id];
    const nozzle = this.mesh(this.car, group, FINISHES.nozzle, geometry);
    nozzle.name = id;
    nozzle.position.set(...at);
    nozzle.quaternion.setFromUnitVectors(UP, new Vector3(...dir));
    this.nozzles.set(id, {
      mesh: nozzle,
      idle: this.resources.materials.get(group, FINISHES.nozzle),
    });
  }

  private addLabels(): void {
    PART_IDS.forEach((id) => {
      const onCar = CAR_LABEL_SPOTS[id];
      const spot = onCar ?? SITE_LABEL_SPOTS[id];
      if (!spot) throw new Error(`Missing label spot for ${id}`);
      this.labels.set(id, anchorAt(onCar ? this.car : this.site, ...spot));
    });
  }

  setState(state: AssemblyState): void {
    applyCarPose(this.car, state.car);
    this.nozzles.forEach(({ mesh, idle }, id) => {
      const lit = state.nozzles[id] > 0 && !state.tank.empty;
      mesh.material = lit ? this.firing : idle;
    });
    this.fanGlow.visible = state.fans;
    this.chase = {
      position: state.car.position,
      heading: 0,
      pitch: state.car.pitch,
      roll: state.car.roll,
      span: CAR.wheelbase,
    };
  }

  update(): boolean {
    return false;
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
    if (!isCarRegion(id)) return regionFromSpec(SITE_REGIONS[id]);
    this.car.updateWorldMatrix(true, false);
    return carRegion(id, this.car.matrixWorld);
  }

  chaseTarget(): ChaseTarget {
    return this.chase;
  }

  dispose(): void {
    this.geometries.forEach((geometry) => geometry.dispose());
    this.root.removeFromParent();
  }
}

export function createPlaceholderAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new PlaceholderAssembly(resources, state);
}
