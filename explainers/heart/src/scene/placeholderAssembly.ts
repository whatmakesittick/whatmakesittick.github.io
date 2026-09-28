import { CylinderGeometry, Group, Mesh, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import type { Box3, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import { ResourceTracker } from '@core/scene/resources';
import { CHAMBER_IDS, PART_IDS, VALVE_IDS, VALVE_PARTS } from '../ids';
import type { AnchorId, AssemblyState, ChamberId, PartId, RegionId, ValveId } from '../ids';
import {
  APEX,
  AV_NODE,
  CHAMBERS,
  HEART_EXTENT,
  PULMONARY_VEIN_MOUTHS,
  SCENE_EXTENT,
  SINUS_NODE,
  VALVES,
  VESSEL_MOUTHS,
  atrialFullness,
  chamberOuterBox,
  isAtrium,
  pad,
  union,
  valveOpening,
  ventricularSqueeze,
} from '../model';
import type { Box, Point, VesselMouth } from '../model';
import { THEME } from '../theme';
import type { Assembly, AssemblyResources } from './assembly';

const SPHERE_SEGMENTS = 24;
const RING_TUBE_MM = 1.5;
const VESSEL_STUB_MM = 45;
const VESSEL_RADIUS_MM = 9;
const NODE_RADIUS_MM = 3;
const SQUEEZE_SHRINK = 0.2;
const ATRIUM_SHRINK = 0.25;
const OPEN_RING_TILT = Math.PI / 2;
const ANCHOR_LIFT_MM = 3;
const REGION_MARGIN_MM = 6;

const MUSCLE: MaterialFinish = { color: THEME.muscle, roughness: 0.6, metalness: 0 };
const VALVE: MaterialFinish = { color: THEME.valve, roughness: 0.5, metalness: 0 };
const ARTERY: MaterialFinish = { color: THEME.arterial, roughness: 0.6, metalness: 0 };
const VEIN: MaterialFinish = { color: THEME.venous, roughness: 0.6, metalness: 0 };
const NODE: MaterialFinish = {
  color: THEME.node,
  emissive: THEME.node,
  emissiveIntensity: 0.6,
  roughness: 0.4,
  metalness: 0,
};

const VESSEL_FINISH: Readonly<Record<keyof typeof VESSEL_MOUTHS, MaterialFinish>> = {
  aorta: ARTERY,
  pulmonaryTrunk: VEIN,
  superiorVenaCava: VEIN,
  inferiorVenaCava: VEIN,
};

const VESSEL_PARTS: Readonly<Record<keyof typeof VESSEL_MOUTHS, PartId>> = {
  aorta: 'aorta',
  pulmonaryTrunk: 'pulmonaryTrunk',
  superiorVenaCava: 'superiorVenaCava',
  inferiorVenaCava: 'inferiorVenaCava',
};

const ANCHOR_POINTS: Readonly<Record<AnchorId, Point>> = {
  apex: APEX,
  tricuspid: VALVES.tricuspid.centre,
  pulmonary: VALVES.pulmonary.centre,
  mitral: VALVES.mitral.centre,
  aortic: VALVES.aortic.centre,
  sinusNode: SINUS_NODE.centre,
  avNode: AV_NODE,
  rightAtrium: CHAMBERS.rightAtrium.centre,
  rightVentricle: CHAMBERS.rightVentricle.centre,
  leftAtrium: CHAMBERS.leftAtrium.centre,
  leftVentricle: CHAMBERS.leftVentricle.centre,
};

function stubEnd({ point, direction }: VesselMouth, length: number): Point {
  const unit = new Vector3(...direction).normalize().multiplyScalar(length);
  return [point[0] + unit.x, point[1] + unit.y, point[2] + unit.z];
}

const LABEL_POINTS: Readonly<Record<PartId, Point>> = {
  rightAtrium: CHAMBERS.rightAtrium.centre,
  rightVentricle: CHAMBERS.rightVentricle.centre,
  leftAtrium: CHAMBERS.leftAtrium.centre,
  leftVentricle: CHAMBERS.leftVentricle.centre,
  septum: [0, -30, 0],
  wall: [CHAMBERS.leftVentricle.centre[0] + CHAMBERS.leftVentricle.radii[0] + 5, -40, 0],
  apex: APEX,
  tricuspidValve: VALVES.tricuspid.centre,
  pulmonaryValve: VALVES.pulmonary.centre,
  mitralValve: VALVES.mitral.centre,
  aorticValve: VALVES.aortic.centre,
  chordae: [21, -20, 0],
  aorta: stubEnd(VESSEL_MOUTHS.aorta, VESSEL_STUB_MM / 2),
  archBranches: stubEnd(VESSEL_MOUTHS.aorta, VESSEL_STUB_MM),
  pulmonaryTrunk: stubEnd(VESSEL_MOUTHS.pulmonaryTrunk, VESSEL_STUB_MM / 2),
  pulmonaryArteries: stubEnd(VESSEL_MOUTHS.pulmonaryTrunk, VESSEL_STUB_MM),
  superiorVenaCava: stubEnd(VESSEL_MOUTHS.superiorVenaCava, VESSEL_STUB_MM / 2),
  inferiorVenaCava: stubEnd(VESSEL_MOUTHS.inferiorVenaCava, VESSEL_STUB_MM / 2),
  pulmonaryVeins: stubEnd(PULMONARY_VEIN_MOUTHS[0], VESSEL_STUB_MM / 2),
  coronaries: [0, -10, 24],
  sinusNode: SINUS_NODE.centre,
  avNode: AV_NODE,
  bundleBranches: [0, -40, 0],
  purkinjeFibres: [10, -60, 0],
  venousBlood: stubEnd(VESSEL_MOUTHS.superiorVenaCava, VESSEL_STUB_MM * 0.8),
  arterialBlood: stubEnd(VESSEL_MOUTHS.aorta, VESSEL_STUB_MM * 0.8),
};

function chamberUnion(chambers: readonly ChamberId[]): Box {
  return pad(union(chambers.map(chamberOuterBox)), REGION_MARGIN_MM);
}

function valveBand(): Box {
  const centres = VALVE_IDS.map((valve) => VALVES[valve]);
  return pad(
    {
      x: [
        Math.min(...centres.map((valve) => valve.centre[0] - valve.radius)),
        Math.max(...centres.map((valve) => valve.centre[0] + valve.radius)),
      ],
      y: [
        Math.min(...centres.map((valve) => valve.centre[1])),
        Math.max(...centres.map((valve) => valve.centre[1])),
      ],
      z: [
        Math.min(...centres.map((valve) => valve.centre[2] - valve.radius)),
        Math.max(...centres.map((valve) => valve.centre[2] + valve.radius)),
      ],
    },
    REGION_MARGIN_MM,
  );
}

const REGIONS: Readonly<Record<RegionId, RegionSpec>> = {
  scene: SCENE_EXTENT,
  heart: HEART_EXTENT,
  chambers: chamberUnion(CHAMBER_IDS),
  leftHeart: chamberUnion(['leftAtrium', 'leftVentricle']),
  rightHeart: chamberUnion(['rightAtrium', 'rightVentricle']),
  conduction: chamberUnion(['rightAtrium', 'rightVentricle', 'leftVentricle']),
  valves: valveBand(),
  atria: chamberUnion(['rightAtrium', 'leftAtrium']),
  ventricles: chamberUnion(['rightVentricle', 'leftVentricle']),
};

function facing(mesh: Mesh, normal: Point): void {
  mesh.lookAt(
    mesh.position.x + normal[0],
    mesh.position.y + normal[1],
    mesh.position.z + normal[2],
  );
}

export class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly resources: AssemblyResources;
  private readonly tracker = new ResourceTracker();
  private readonly chambers = new Map<ChamberId, Mesh>();
  private readonly rings = new Map<ValveId, Mesh>();
  private readonly conduction = new Group();
  private readonly anchors = new Map<AnchorId, Object3D>();
  private readonly labels = new Map<PartId, Object3D>();

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.resources = resources;
    this.buildChambers();
    this.buildValves();
    this.buildVessels();
    this.buildConduction();
    this.buildAnchors();
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const squeeze = ventricularSqueeze(state.time);
    const fullness = atrialFullness(state.time);
    for (const [id, mesh] of this.chambers) {
      const scale = isAtrium(id)
        ? 1 - ATRIUM_SHRINK * (1 - fullness)
        : 1 - SQUEEZE_SHRINK * squeeze;
      mesh.scale.setScalar(scale);
    }
    for (const [id, ring] of this.rings) {
      const opening = valveOpening(id, state.time);
      facing(ring, VALVES[id].normal);
      ring.rotateX(OPEN_RING_TILT * (1 - opening) * 0.5);
    }
    this.conduction.visible = state.view.conduction;
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
    geometry: SphereGeometry | TorusGeometry | CylinderGeometry,
    group: string,
    finish: MaterialFinish,
  ): Mesh {
    const mesh = new Mesh(
      this.tracker.track(geometry),
      this.resources.materials.get(group, finish),
    );
    this.root.add(mesh);
    return mesh;
  }

  private buildChambers(): void {
    for (const id of CHAMBER_IDS) {
      const { centre, radii, wall } = CHAMBERS[id];
      const geometry = new SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
      geometry.scale(radii[0] + wall, radii[1] + wall, radii[2] + wall);
      const mesh = this.mesh(geometry, id, MUSCLE);
      mesh.position.set(...centre);
      this.chambers.set(id, mesh);
    }
    const apex = this.mesh(new SphereGeometry(6, SPHERE_SEGMENTS, SPHERE_SEGMENTS), 'apex', MUSCLE);
    apex.position.set(...APEX);
  }

  private buildValves(): void {
    for (const id of VALVE_IDS) {
      const { centre, radius } = VALVES[id];
      const ring = this.mesh(
        new TorusGeometry(radius, RING_TUBE_MM, 8, 32),
        VALVE_PARTS[id],
        VALVE,
      );
      ring.position.set(...centre);
      this.rings.set(id, ring);
    }
  }

  private buildVessels(): void {
    for (const key of Object.keys(VESSEL_MOUTHS) as (keyof typeof VESSEL_MOUTHS)[]) {
      this.stub(VESSEL_MOUTHS[key], VESSEL_PARTS[key], VESSEL_FINISH[key], VESSEL_RADIUS_MM);
    }
    for (const mouth of PULMONARY_VEIN_MOUTHS) {
      this.stub(mouth, 'pulmonaryVeins', ARTERY, VESSEL_RADIUS_MM / 2);
    }
  }

  private stub(mouth: VesselMouth, part: PartId, finish: MaterialFinish, radius: number): void {
    const geometry = new CylinderGeometry(radius, radius, VESSEL_STUB_MM, 16);
    geometry.translate(0, VESSEL_STUB_MM / 2, 0);
    const mesh = this.mesh(geometry, part, finish);
    mesh.position.set(...mouth.point);
    const target = stubEnd(mouth, 1);
    mesh.quaternion.setFromUnitVectors(
      new Vector3(0, 1, 0),
      new Vector3(
        target[0] - mouth.point[0],
        target[1] - mouth.point[1],
        target[2] - mouth.point[2],
      ).normalize(),
    );
  }

  private buildConduction(): void {
    this.root.add(this.conduction);
    const geometry = this.tracker.track(new SphereGeometry(NODE_RADIUS_MM, 12, 12));
    for (const [group, point] of [
      ['sinusNode', SINUS_NODE.centre],
      ['avNode', AV_NODE],
    ] as const) {
      const node = new Mesh(geometry, this.resources.materials.get(group, NODE));
      node.position.set(...point);
      this.conduction.add(node);
    }
    const bundle = new Mesh(
      this.tracker.track(new CylinderGeometry(1, 1, 60, 8)),
      this.resources.materials.get('bundleBranches', NODE),
    );
    bundle.position.set(0, -32, 0);
    this.conduction.add(bundle);
    const fibres = new Mesh(
      this.tracker.track(new SphereGeometry(4, 8, 8)),
      this.resources.materials.get('purkinjeFibres', NODE),
    );
    fibres.position.set(...LABEL_POINTS.purkinjeFibres);
    this.conduction.add(fibres);
  }

  private buildAnchors(): void {
    for (const id of Object.keys(ANCHOR_POINTS) as AnchorId[]) {
      const [x, y, z] = ANCHOR_POINTS[id];
      this.anchors.set(id, anchorAt(this.root, x, y, z));
    }
    for (const id of PART_IDS) {
      const [x, y, z] = LABEL_POINTS[id];
      this.labels.set(id, anchorAt(this.root, x, y, z + ANCHOR_LIFT_MM));
    }
  }
}
