import { Box3, BoxGeometry, Group, Mesh, PlaneGeometry } from 'three';
import type { Object3D } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { regionFromSpec } from '@core/scene/regions';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { PART_IDS } from '../ids';
import {
  AIRCRAFT,
  AIRCRAFT_LAYOUT,
  AIRFIELD_BOUNDS,
  GROUND_STATION,
  RUNWAY,
  SATELLITE_POSITION,
  SCENE_BOUNDS,
  TARGET,
  TARGET_BOUNDS,
} from '../model/layout';
import { THEME } from '../theme';
import type { Assembly, AssemblyResources, ChaseTarget } from './assembly';
import { applyFlightPose } from './pose';

const GROUND_SIZE = 4000;
const FUSELAGE_GIRTH = 1.2;
const WING_CHORD = 1.4;
const WING_THICKNESS = 0.2;
const TAIL_SIZE = 2;
const MARKER_SIZE = 8;
const SATELLITE_SIZE = 30;

function boxMesh(
  resources: AssemblyResources,
  group: string,
  color: string,
  size: readonly [number, number, number],
  at: readonly [number, number, number],
): Mesh {
  const mesh = new Mesh(
    new BoxGeometry(size[0], size[1], size[2]),
    resources.materials.get(group, { color }),
  );
  mesh.position.set(at[0], at[1], at[2]);
  return mesh;
}

class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly aircraft = new Group();
  private readonly anchors = new Map<PartId, Object3D>();
  private readonly namedAnchors: Record<AnchorId, Object3D>;
  private readonly regions: Record<RegionId, Box3>;
  private state: AssemblyState;
  private readonly bounds = new Box3();

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.state = state;
    this.buildGround(resources);
    this.buildAircraft(resources);
    this.root.add(this.aircraft);
    this.namedAnchors = {
      aircraft: this.aircraft,
      sensorBall: anchorAt(this.aircraft, ...AIRCRAFT_LAYOUT.sensorBall),
      hump: anchorAt(this.aircraft, ...AIRCRAFT_LAYOUT.hump),
      target: anchorAt(this.root, ...TARGET),
      groundStation: anchorAt(this.root, ...GROUND_STATION),
      satellite: anchorAt(this.root, ...SATELLITE_POSITION),
      missile: anchorAt(this.aircraft, AIRCRAFT_LAYOUT.pylonX, AIRCRAFT_LAYOUT.pylonY, 0),
    };
    this.regions = {
      scene: regionFromSpec(SCENE_BOUNDS),
      airfield: regionFromSpec(AIRFIELD_BOUNDS),
      aircraft: new Box3(),
      target: regionFromSpec(TARGET_BOUNDS),
    };
    for (const id of PART_IDS) {
      this.anchors.set(id, anchorAt(this.aircraft, 0, 0, 0));
    }
    this.setState(state);
  }

  private buildGround(resources: AssemblyResources): void {
    const ground = new Mesh(
      new PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
      resources.materials.get(STRUCTURE_GROUP, { color: THEME.sand }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.root.add(ground);
    const runwayLength = RUNWAY.x[1] - RUNWAY.x[0];
    this.root.add(
      boxMesh(
        resources,
        'runway',
        THEME.airframeDark,
        [runwayLength, 0.2, RUNWAY.halfWidth * 2],
        [(RUNWAY.x[0] + RUNWAY.x[1]) / 2, 0.1, RUNWAY.z],
      ),
    );
    this.root.add(
      boxMesh(
        resources,
        'target',
        THEME.strike,
        [MARKER_SIZE, 2, MARKER_SIZE],
        [TARGET[0], 1, TARGET[2]],
      ),
    );
    this.root.add(
      boxMesh(
        resources,
        'groundStation',
        THEME.losLink,
        [6, 3, 3],
        [GROUND_STATION[0], 1.5, GROUND_STATION[2]],
      ),
    );
    this.root.add(
      boxMesh(
        resources,
        'satellite',
        THEME.satLink,
        [SATELLITE_SIZE, SATELLITE_SIZE, SATELLITE_SIZE],
        SATELLITE_POSITION,
      ),
    );
  }

  private buildAircraft(resources: AssemblyResources): void {
    this.aircraft.add(
      boxMesh(
        resources,
        'fuselage',
        THEME.airframe,
        [AIRCRAFT.length, FUSELAGE_GIRTH, FUSELAGE_GIRTH],
        [0.5, 0, 0],
      ),
    );
    this.aircraft.add(
      boxMesh(
        resources,
        'wing',
        THEME.airframe,
        [WING_CHORD, WING_THICKNESS, AIRCRAFT.span],
        AIRCRAFT_LAYOUT.wingQuarterChord,
      ),
    );
    this.aircraft.add(
      boxMesh(
        resources,
        'vTail',
        THEME.airframe,
        [1, TAIL_SIZE, TAIL_SIZE],
        [AIRCRAFT_LAYOUT.tailTop[0], 1, 0],
      ),
    );
    this.aircraft.add(
      boxMesh(
        resources,
        'sensorBall',
        THEME.sensorGlass,
        [AIRCRAFT.sensorBallDiameter, AIRCRAFT.sensorBallDiameter, AIRCRAFT.sensorBallDiameter],
        AIRCRAFT_LAYOUT.sensorBall,
      ),
    );
  }

  setState(state: AssemblyState): void {
    this.state = state;
    applyFlightPose(this.aircraft, state.flight);
    this.aircraft.updateMatrixWorld(true);
    this.regions.aircraft.copy(this.bounds.setFromObject(this.aircraft));
  }

  update(): boolean {
    return false;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.anchors;
  }

  anchor(id: AnchorId): Object3D {
    return this.namedAnchors[id];
  }

  region(id: RegionId): Box3 {
    return this.regions[id];
  }

  chaseTarget(): ChaseTarget {
    const { position, heading } = this.state.flight;
    return { position, heading, span: AIRCRAFT.span, target: TARGET };
  }

  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    this.root.clear();
  }
}

export function createPlaceholderAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new PlaceholderAssembly(resources, state);
}
