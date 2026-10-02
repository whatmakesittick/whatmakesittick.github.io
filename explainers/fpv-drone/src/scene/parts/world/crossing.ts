import { CylinderGeometry, Group, Shape } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { extrudeProfileAlongX } from '@core/scene/geometry/extrude';
import { anchorAt } from '@core/scene/parts';
import { CROSSING } from '../../constants';
import { WORLD_FINISHES } from '../../finishes';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

type Triple = readonly [number, number, number];

const QUARTER_TURN = Math.PI / 2;
const ENDS = [-1, 1] as const;

function centredBox(at: Triple, size: Triple): BufferGeometry {
  return box({
    minX: at[0] - size[0] / 2,
    maxX: at[0] + size[0] / 2,
    minY: at[1],
    maxY: at[1] + size[1],
    minZ: at[2] - size[2] / 2,
    maxZ: at[2] + size[2] / 2,
  });
}

function shedGeometry(): { walls: BufferGeometry; roof: BufferGeometry; door: BufferGeometry } {
  const { size, roof, door } = CROSSING.shed;
  const [length, wall, depth] = size;
  const walls = centredBox([0, 0, 0], size);
  const gable = new Shape();
  const half = depth / 2 + roof.overhang;
  gable.moveTo(-half, wall - 0.05);
  gable.lineTo(half, wall - 0.05);
  gable.lineTo(0, wall + roof.rise);
  gable.closePath();
  const roofGeometry = extrudeProfileAlongX(
    gable,
    -length / 2 - roof.overhang,
    length / 2 + roof.overhang,
  );
  const doorGeometry = centredBox(
    [length * 0.2, 0, -depth / 2 - door.depth / 2],
    [door.width, door.height, door.depth],
  );
  return { walls, roof: roofGeometry, door: doorGeometry };
}

function carGeometry(): { body: BufferGeometry; glass: BufferGeometry; wheels: BufferGeometry } {
  const { body, cabin, cabinShift, clearance, wheel } = CROSSING.car;
  const shell = centredBox([0, clearance, 0], body);
  const top = centredBox([body[0] * cabinShift, clearance + body[1], 0], cabin);
  const glass = centredBox(
    [body[0] * cabinShift + cabin[0] / 2, clearance + body[1] + 0.05, 0],
    [0.05, cabin[1] * 0.7, cabin[2] * 0.85],
  );
  const wheels = ENDS.flatMap((end) =>
    ENDS.map((side) => {
      const tyre = new CylinderGeometry(wheel.radius, wheel.radius, wheel.width, wheel.segments);
      tyre.rotateX(QUARTER_TURN);
      tyre.translate(end * wheel.axle, wheel.radius, side * (body[2] / 2 - wheel.width * 0.3));
      return tyre;
    }),
  );
  return { body: mergeParts([shell, top]), glass, wheels: mergeParts(wheels) };
}

export interface CrossingPart {
  object: Group;
  anchor: Object3D;
}

export function createCrossing(context: PartContext): CrossingPart {
  const { centre, shed, car, anchorLift } = CROSSING;
  const object = new Group();
  object.position.set(...centre);
  const shedParts = shedGeometry();
  const shedGroup = new Group();
  shedGroup.position.set(...shed.at);
  shedGroup.rotation.y = shed.heading;
  shedGroup.add(
    partMesh(context, shedParts.walls, 'crossroads', WORLD_FINISHES.shedWall),
    partMesh(context, shedParts.roof, 'crossroads', WORLD_FINISHES.shedRoof),
    partMesh(context, shedParts.door, 'crossroads', WORLD_FINISHES.shedDoor),
  );
  const carParts = carGeometry();
  const carGroup = new Group();
  carGroup.position.set(...car.at);
  carGroup.rotation.set(0, car.heading, car.sag);
  carGroup.add(
    partMesh(context, carParts.body, 'crossroads', WORLD_FINISHES.carRust),
    partMesh(context, carParts.glass, 'crossroads', WORLD_FINISHES.carGlass),
    partMesh(context, carParts.wheels, 'crossroads', WORLD_FINISHES.tyre),
  );
  object.add(shedGroup, carGroup);
  return { object, anchor: anchorAt(object, 0, anchorLift, 0) };
}
