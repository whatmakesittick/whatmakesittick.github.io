import { Box3, BoxGeometry, Group, Mesh, PlaneGeometry } from 'three';
import type { Object3D } from 'three';
import { STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { regionFromSpec } from '@core/scene/regions';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, Point, RegionId } from '../ids';
import {
  CROSSROADS,
  CROSSROADS_BOUNDS,
  DRONE,
  DRONE_LAYOUT,
  ROUTE_BOUNDS,
  SCENE_BOUNDS,
  STATION,
  STATION_BOUNDS,
} from '../model/layout';
import { droneUnits } from '../model/scale';
import { THEME } from '../theme';
import type { Assembly, AssemblyResources, ChaseTarget } from './assembly';

const GROUND_SIZE = 600;
const STATION_SIZE: Point = [3, 1.2, 3];
const CROSSROADS_SIZE: Point = [8, 0.2, 8];
const HALF = 0.5;

function pointOf(point: Point): Point {
  return [point[0], point[1], point[2]];
}

class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly resources: AssemblyResources;
  private readonly drone = new Group();
  private readonly labels = new Map<PartId, Object3D>();
  private readonly named: Record<AnchorId, Object3D>;
  private readonly regions: Record<RegionId, Box3>;
  private chase: ChaseTarget = { position: [0, 0, 0], heading: 0, pitch: 0, roll: 0, span: 1 };

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.resources = resources;
    const station = this.block(STATION_SIZE, STATION, 'groundStation', THEME.oliveDark);
    const crossroads = this.block(CROSSROADS_SIZE, CROSSROADS, 'crossroads', THEME.earth);
    const body = this.block(
      [droneUnits(DRONE.plateLength), droneUnits(DRONE.plateGap), droneUnits(DRONE.plateWidth)],
      [0, 0, 0],
      'frame',
      THEME.carbon,
    );
    this.drone.add(body);
    const camera = anchorAt(this.drone, ...this.scaled(DRONE_LAYOUT.camera));
    this.labels.set('camera', camera);
    this.root.add(this.ground(), station, crossroads, this.drone);
    this.named = {
      drone: this.drone,
      camera,
      station,
      crossroads,
    };
    this.regions = {
      scene: regionFromSpec(SCENE_BOUNDS),
      station: regionFromSpec(STATION_BOUNDS),
      crossroads: regionFromSpec(CROSSROADS_BOUNDS),
      route: regionFromSpec(ROUTE_BOUNDS),
      drone: new Box3(),
    };
    this.setState(state);
  }

  private scaled(point: Point): Point {
    return [droneUnits(point[0]), droneUnits(point[1]), droneUnits(point[2])];
  }

  private ground(): Mesh {
    const geometry = this.tracker.track(new PlaneGeometry(GROUND_SIZE, GROUND_SIZE));
    const mesh = new Mesh(
      geometry,
      this.resources.materials.get(UNDIMMED_GROUP, { color: THEME.grass, roughness: 1 }),
    );
    mesh.rotation.x = -Math.PI * HALF;
    return mesh;
  }

  private block(
    size: Point,
    at: Point,
    group: PartId | typeof STRUCTURE_GROUP,
    color: string,
  ): Mesh {
    const geometry = this.tracker.track(new BoxGeometry(...size));
    const mesh = new Mesh(geometry, this.resources.materials.get(group, { color, roughness: 0.8 }));
    mesh.position.set(at[0], at[1] + size[1] * HALF, at[2]);
    if (group !== STRUCTURE_GROUP) this.labels.set(group, mesh);
    return mesh;
  }

  setState(state: AssemblyState): void {
    const { position, heading, pitch, roll } = state.flight;
    this.drone.position.set(position[0], position[1] + droneUnits(DRONE.restHeight), position[2]);
    this.drone.rotation.set(roll, -heading, -pitch, 'YZX');
    this.drone.updateMatrixWorld();
    this.regions.drone.setFromObject(this.drone);
    this.chase = {
      position: pointOf(position),
      heading,
      pitch,
      roll,
      span: droneUnits(DRONE.wheelbase),
    };
  }

  update(): boolean {
    return false;
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

  dispose(): void {
    this.root.removeFromParent();
    this.resources.materials.clearRegistered();
    this.tracker.dispose();
  }
}

export function createPlaceholderAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new PlaceholderAssembly(resources, state);
}
