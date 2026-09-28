import { Box3, BoxGeometry, Group, Mesh, SphereGeometry, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import type { MaterialFinish } from '@core/scene/materials';
import { STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { PART_IDS } from '../ids';
import {
  BULKHEAD,
  HERO_PANEL_INDEX,
  HINGE,
  HOUSE_WALL_BOTTOM_CM,
  INVERTER,
  METER,
  MODULE,
  PANEL_COUNT,
  PARAPET,
  SUN_ARC_RADIUS_CM,
  SUN_DISC_RADIUS_CM,
  TERRACE,
  SLICE_LIFT_CM,
  panelCentreX,
  sunDirection,
  sunElevationDeg,
  um,
} from '../model';
import type { Assembly, AssemblyResources } from './assembly';

const FINISH = {
  concrete: { color: '#8f8a80', roughness: 0.95, metalness: 0 },
  wall: { color: '#d9cdb8', roughness: 0.9, metalness: 0 },
  panel: { color: '#1f2f6b', roughness: 0.35, metalness: 0.2 },
  frame: { color: '#c9ced6', roughness: 0.5, metalness: 0.6 },
  box: { color: '#e6e9ee', roughness: 0.6, metalness: 0.1 },
  sun: { color: '#ffd166', emissive: '#ffb347', emissiveIntensity: 1.2, roughness: 1 },
  slice: { color: '#4cc3ff', roughness: 0.6, metalness: 0 },
} satisfies Record<string, MaterialFinish>;

const RIGHT_ANGLE_DEG = 90;
const SUN_HIDE_ELEVATION_DEG = -2;
const SLICE_UM = { width: 600, thickness: 170, depth: 400 } as const;
const CELL_CORNER_CM = 9.1;

export class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly resources: AssemblyResources;
  private readonly tracker = new ResourceTracker();
  private readonly anchors = new Map<AnchorId, Object3D>();
  private readonly labels = new Map<PartId, Object3D>();
  private readonly house = new Group();
  private readonly array = new Group();
  private readonly pivots: Group[] = [];
  private readonly slice = new Group();
  private readonly equipment = new Group();
  private readonly sun: Mesh;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.resources = resources;
    this.buildHouse();
    this.buildArray();
    this.buildEquipment();
    this.buildSlice();
    this.sun = this.mesh(
      new SphereGeometry(SUN_DISC_RADIUS_CM, 24, 16),
      UNDIMMED_GROUP,
      FINISH.sun,
    );
    this.root.add(this.house, this.array, this.equipment, this.sun);
    this.anchors.set('sun', this.sun);
    this.labels.set('sun', this.sun);
    this.fillMissingLabels();
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const lean = -toRadians(RIGHT_ANGLE_DEG - state.tilt);
    this.pivots.forEach((pivot) => {
      pivot.rotation.x = lean;
    });
    this.sun.position.copy(sunWorldPosition(state.minute));
    this.sun.visible = sunElevationDeg(state.minute) > SUN_HIDE_ELEVATION_DEG;
    this.slice.visible = state.view.slice;
  }

  update(): void {}

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
    const box = new Box3();
    const include = (object: Object3D) => box.union(new Box3().setFromObject(object));
    switch (id) {
      case 'scene':
        include(this.house);
        include(this.array);
        include(this.equipment);
        break;
      case 'house':
        include(this.house);
        include(this.array);
        include(this.equipment);
        break;
      case 'array':
        include(this.array);
        break;
      case 'panel':
      case 'stack':
        include(this.pivots[HERO_PANEL_INDEX]);
        break;
      case 'slice':
        include(this.slice);
        break;
      case 'inverter':
        include(this.equipment);
        break;
    }
    return box;
  }

  dispose(): void {
    this.tracker.dispose();
    this.resources.materials.clearRegistered();
  }

  private buildHouse(): void {
    const width = TERRACE.x[1] - TERRACE.x[0];
    const depth = TERRACE.z[1] - TERRACE.z[0];
    const wallHeight = -HOUSE_WALL_BOTTOM_CM;
    const walls = this.mesh(
      new BoxGeometry(width, wallHeight, depth),
      STRUCTURE_GROUP,
      FINISH.wall,
    );
    walls.position.y = HOUSE_WALL_BOTTOM_CM / 2;
    const terrace = this.mesh(new BoxGeometry(width, 2, depth), 'roof', FINISH.concrete);
    terrace.position.y = -1;
    const parapetSides = [
      [width, PARAPET.thickness, 0, TERRACE.z[1] - PARAPET.thickness / 2],
      [width, PARAPET.thickness, 0, TERRACE.z[0] + PARAPET.thickness / 2],
      [PARAPET.thickness, depth, TERRACE.x[0] + PARAPET.thickness / 2, 0],
      [PARAPET.thickness, depth, TERRACE.x[1] - PARAPET.thickness / 2, 0],
    ] as const;
    parapetSides.forEach(([sizeX, sizeZ, x, z]) => {
      const side = this.mesh(new BoxGeometry(sizeX, PARAPET.height, sizeZ), 'roof', FINISH.wall);
      side.position.set(x, PARAPET.height / 2, z);
      this.house.add(side);
    });
    const bulkhead = this.mesh(
      new BoxGeometry(
        BULKHEAD.x[1] - BULKHEAD.x[0],
        BULKHEAD.height,
        BULKHEAD.z[1] - BULKHEAD.z[0],
      ),
      STRUCTURE_GROUP,
      FINISH.wall,
    );
    bulkhead.position.set(
      (BULKHEAD.x[0] + BULKHEAD.x[1]) / 2,
      BULKHEAD.height / 2,
      (BULKHEAD.z[0] + BULKHEAD.z[1]) / 2,
    );
    this.house.add(walls, terrace, bulkhead);
    this.labels.set('roof', anchorAt(this.house, TERRACE.x[1] - 60, PARAPET.height, 0));
  }

  private buildArray(): void {
    for (let index = 0; index < PANEL_COUNT; index += 1) {
      const pivot = new Group();
      pivot.position.set(panelCentreX(index), HINGE.y, HINGE.z);
      const isHero = index === HERO_PANEL_INDEX;
      const panel = this.mesh(
        new BoxGeometry(MODULE.width, MODULE.height, MODULE.depth),
        isHero ? 'panel' : STRUCTURE_GROUP,
        FINISH.panel,
      );
      panel.position.y = MODULE.height / 2;
      pivot.add(panel);
      if (isHero) {
        const centre = anchorAt(pivot, 0, MODULE.height / 2, MODULE.depth);
        this.anchors.set('panel', centre);
        this.labels.set('panel', centre);
        const box = anchorAt(pivot, 0, MODULE.height / 2, -MODULE.depth);
        this.anchors.set('junctionBox', box);
        this.labels.set('junctionBox', box);
        this.labels.set('frame', anchorAt(pivot, MODULE.width / 2, MODULE.height / 4, 0));
      }
      this.pivots.push(pivot);
      this.array.add(pivot);
    }
  }

  private buildEquipment(): void {
    const inverter = this.mesh(
      new BoxGeometry(INVERTER.size.depth, INVERTER.size.height, INVERTER.size.width),
      'inverter',
      FINISH.box,
    );
    inverter.position.set(
      INVERTER.position.x + INVERTER.size.depth / 2,
      INVERTER.position.y,
      INVERTER.position.z,
    );
    const meter = this.mesh(
      new BoxGeometry(METER.size.depth, METER.size.height, METER.size.width),
      'meter',
      FINISH.box,
    );
    meter.position.set(METER.position.x + METER.size.depth / 2, METER.position.y, METER.position.z);
    this.equipment.add(inverter, meter);
    this.anchors.set('inverter', inverter);
    this.labels.set('inverter', inverter);
    this.labels.set('meter', meter);
  }

  private buildSlice(): void {
    const block = this.mesh(
      new BoxGeometry(um(SLICE_UM.width), um(SLICE_UM.depth), um(SLICE_UM.thickness)),
      'base',
      FINISH.slice,
    );
    this.slice.add(block);
    this.slice.position.set(
      -MODULE.width / 2 + CELL_CORNER_CM + um(SLICE_UM.width) / 2,
      MODULE.height - CELL_CORNER_CM,
      SLICE_LIFT_CM,
    );
    this.pivots[HERO_PANEL_INDEX].add(this.slice);
    this.anchors.set('slice', block);
    this.labels.set('base', block);
  }

  private fillMissingLabels(): void {
    const hero = this.anchors.get('panel');
    if (!hero) return;
    PART_IDS.forEach((id) => {
      if (!this.labels.has(id)) this.labels.set(id, hero);
    });
  }

  private mesh(geometry: BufferGeometry, group: string, finish: MaterialFinish): Mesh {
    const material = this.resources.materials.get(group, finish);
    return new Mesh(this.tracker.track(geometry), material);
  }
}

function sunWorldPosition(minute: number): Vector3 {
  const [x, y, z] = sunDirection(minute);
  return new Vector3(x, y, z).multiplyScalar(SUN_ARC_RADIUS_CM);
}
