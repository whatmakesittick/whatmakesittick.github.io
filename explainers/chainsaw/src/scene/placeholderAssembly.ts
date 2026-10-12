import { Box3, Group, Mesh, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { box } from '@core/scene/geometry/box';
import { anchorAt } from '@core/scene/parts';
import { ANCHOR_IDS, PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, Point, RegionId } from '../ids';
import {
  ANCHOR_POINTS,
  CRANK_Y,
  REGION_BOUNDS,
  SAW_GEOMETRY,
  SETTING_LAYOUT,
  crankPin,
  crownY,
  pointOnLoop,
} from '../model';
import { THEME } from '../theme';
import type { Assembly, AssemblyResources } from './assembly';

const MARKER_HALF = 0.008;
const PLACEHOLDER_FINISH = { color: THEME.housing, roughness: 0.7, metalness: 0.1 } as const;

const PART_SPOTS: Readonly<Record<PartId, Point>> = {
  powerhead: [-0.02, 0.24, 0],
  rearHandle: [-0.3, 0.16, 0],
  throttleTrigger: SAW_GEOMETRY.trigger,
  frontHandle: [0.04, 0.3, -0.02],
  handGuard: [0.075, 0.28, 0],
  starter: [-0.01, 0.11, -0.09],
  sparkPlug: [0, 0.25, 0],
  cylinder: [0.025, 0.2, 0],
  piston: [0, 0.2, 0],
  connectingRod: [0, 0.15, 0],
  crankshaft: ANCHOR_POINTS.crank,
  crankcase: [-0.04, 0.08, 0],
  exhaustPort: [0.025, 0.18, 0],
  transferPorts: [0, 0.18, -0.025],
  intakePort: [-0.025, 0.14, 0],
  muffler: [0.08, 0.18, 0.02],
  carburettor: [-0.085, 0.155, 0],
  throttleValve: [-0.07, 0.155, 0],
  chokeValve: [-0.1, 0.155, 0],
  airFilter: [-0.07, 0.215, 0],
  fuelTank: [-0.18, 0.04, 0],
  pulseLine: [-0.06, 0.12, 0],
  clutch: [0, CRANK_Y + 0.02, SAW_GEOMETRY.clutchShoesZ],
  clutchDrum: [0, CRANK_Y + SAW_GEOMETRY.drumRadius, 0.07],
  sprocket: ANCHOR_POINTS.sprocket,
  chainBrakeBand: [0, CRANK_Y - SAW_GEOMETRY.drumRadius, 0.07],
  oilPump: [0.03, 0.06, 0.06],
  oilTank: [0.06, 0.03, 0.05],
  bar: [0.25, CRANK_Y, ANCHOR_POINTS.nose[2]],
  barNose: ANCHOR_POINTS.nose,
  chain: [0.2, CRANK_Y + 0.022, ANCHOR_POINTS.nose[2]],
  cutters: [0.3, CRANK_Y + 0.025, ANCHOR_POINTS.nose[2]],
  depthGauges: [0.32, CRANK_Y + 0.024, ANCHOR_POINTS.nose[2]],
  driveLinks: [0.15, CRANK_Y + 0.018, ANCHOR_POINTS.nose[2]],
  chainCatcher: SAW_GEOMETRY.chainCatcher,
  kickbackZone: [ANCHOR_POINTS.nose[0] + 0.015, CRANK_Y + 0.015, ANCHOR_POINTS.nose[2]],
  freshCharge: [0, 0.16, -0.03],
  exhaustGas: [0.06, 0.18, 0],
  oilFlow: [0.02, CRANK_Y, 0.09],
  log: [0.3, -0.02, ANCHOR_POINTS.nose[2]],
  chips: [0.15, 0, ANCHOR_POINTS.nose[2]],
};

function markerGeometry([x, y, z]: Point): BufferGeometry {
  return box({
    minX: x - MARKER_HALF,
    maxX: x + MARKER_HALF,
    minY: y - MARKER_HALF,
    maxY: y + MARKER_HALF,
    minZ: z - MARKER_HALF,
    maxZ: z + MARKER_HALF,
  });
}

function boxOf(bounds: { min: Point; max: Point }): Box3 {
  return new Box3(new Vector3(...bounds.min), new Vector3(...bounds.max));
}

class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly pivot = new Group();
  private readonly saw = new Group();
  private readonly meshes = new Map<PartId, Mesh>();
  private readonly labels = new Map<PartId, Object3D>();
  private readonly anchors = new Map<AnchorId, Object3D>();
  private readonly geometries: BufferGeometry[] = [];
  private lift = 0;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    const [pivotX, pivotY] = SAW_GEOMETRY.rearGrip;
    this.pivot.position.set(pivotX, pivotY, 0);
    this.saw.position.set(-pivotX, -pivotY, 0);
    this.pivot.add(this.saw);
    this.root.add(this.pivot);
    PART_IDS.forEach((id) => this.addPart(resources, id));
    ANCHOR_IDS.forEach((id) => this.anchors.set(id, anchorAt(this.saw, ...ANCHOR_POINTS[id])));
    this.setState(state);
  }

  private addPart(resources: AssemblyResources, id: PartId): void {
    const geometry = markerGeometry([0, 0, 0]);
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, resources.materials.get(id, PLACEHOLDER_FINISH));
    mesh.position.set(...PART_SPOTS[id]);
    this.saw.add(mesh);
    this.meshes.set(id, mesh);
    this.labels.set(id, mesh);
  }

  private place(id: PartId, x: number, y: number, z: number): void {
    this.meshes.get(id)?.position.set(x, y, z);
  }

  setState(state: AssemblyState): void {
    const { lift, log } = SETTING_LAYOUT[state.setting];
    this.lift = lift;
    this.root.position.y = lift;
    this.pivot.rotation.z = toRadians(state.safety.riseDeg);
    const [pinX, pinY] = crankPin(state.crank.angle);
    this.place('crankshaft', pinX, pinY, 0);
    this.place('piston', 0, crownY(state.crank.angle), 0);
    const link = pointOnLoop(state.drive.chainMm);
    this.place('chain', link.x, link.y, ANCHOR_POINTS.nose[2]);
    const logMesh = this.meshes.get('log');
    if (logMesh) logMesh.visible = log !== null;
    const chips = this.meshes.get('chips');
    if (chips) chips.visible = state.setting === 'cutting';
    const zone = this.meshes.get('kickbackZone');
    if (zone) zone.visible = state.view.zone;
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
    return boxOf(REGION_BOUNDS[id]).translate(new Vector3(0, this.lift, 0));
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
