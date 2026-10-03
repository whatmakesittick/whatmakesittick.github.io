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
type Extent = readonly [number, number];

const QUARTER_TURN = Math.PI / 2;
const ENDS = [-1, 1] as const;
const ROOF_SEAT = 0.05;

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

interface ShedGeometry {
  walls: BufferGeometry;
  roof: BufferGeometry;
  door: BufferGeometry;
  trim: BufferGeometry;
  glass: BufferGeometry;
}

function shedGeometry(): ShedGeometry {
  const { size, roof, door, window } = CROSSING.shed;
  const [length, wall, depth] = size;
  const gable = new Shape();
  const half = depth / 2 + roof.overhang;
  gable.moveTo(-half, wall - ROOF_SEAT);
  gable.lineTo(half, wall - ROOF_SEAT);
  gable.lineTo(0, wall + roof.rise);
  gable.closePath();
  const doorX = length * door.shift;
  const front = depth / 2;
  return {
    walls: centredBox([0, 0, 0], size),
    roof: extrudeProfileAlongX(gable, -length / 2 - roof.overhang, length / 2 + roof.overhang),
    door: centredBox([doorX, 0, front + door.depth / 2], [door.width, door.height, door.depth]),
    trim: centredBox(
      [doorX, 0, front + door.depth / 4],
      [door.width + door.frame * 2, door.height + door.frame, door.depth / 2],
    ),
    glass: centredBox(
      [-length / 2 - window.depth / 2, window.sill, 0],
      [window.depth, window.height, window.width],
    ),
  };
}

function span(extent: Extent, y: Extent, halfWidth: number): BufferGeometry {
  return box({
    minX: extent[0],
    maxX: extent[1],
    minY: y[0],
    maxY: y[1],
    minZ: -halfWidth,
    maxZ: halfWidth,
  });
}

function bodyGeometry(): BufferGeometry {
  const { sill, bonnet, cabin, bed, bumper } = CROSSING.car;
  const floor = sill.y[1];
  const sideZ = sill.halfWidth - bed.wall / 2;
  const sides = ENDS.map((side) =>
    box({
      minX: bed.x[0],
      maxX: bed.x[1],
      minY: floor,
      maxY: bed.top,
      minZ: side * sideZ - bed.wall / 2,
      maxZ: side * sideZ + bed.wall / 2,
    }),
  );
  return mergeParts([
    span(sill.x, sill.y, sill.halfWidth),
    span(bonnet.x, [floor, bonnet.top], bonnet.halfWidth),
    span(cabin.x, [floor, cabin.top], cabin.halfWidth),
    ...sides,
    span([bed.x[0], bed.x[0] + bed.wall], [floor, bed.top], sill.halfWidth),
    span([sill.x[1], sill.x[1] + bumper.depth], bumper.y, bumper.halfWidth),
    span([sill.x[0] - bumper.depth, sill.x[0]], bumper.y, bumper.halfWidth),
  ]);
}

function glassGeometry(): BufferGeometry {
  const { cabin, glass } = CROSSING.car;
  const y: Extent = [glass.bottom, glass.top];
  const windscreen = box({
    minX: cabin.x[1],
    maxX: cabin.x[1] + glass.thickness,
    minY: y[0],
    maxY: y[1],
    minZ: -cabin.halfWidth + glass.inset,
    maxZ: cabin.halfWidth - glass.inset,
  });
  const windows = ENDS.map((side) =>
    box({
      minX: cabin.x[0] + glass.inset,
      maxX: cabin.x[1] - glass.inset,
      minY: y[0],
      maxY: y[1],
      minZ: side * cabin.halfWidth - glass.thickness / 2,
      maxZ: side * cabin.halfWidth + glass.thickness / 2,
    }),
  );
  return mergeParts([windscreen, ...windows]);
}

export function wheelsGeometry(): BufferGeometry {
  const { wheel } = CROSSING.car;
  return mergeParts(
    ENDS.flatMap((end) =>
      ENDS.map((side) => {
        const tyre = new CylinderGeometry(wheel.radius, wheel.radius, wheel.width, wheel.segments);
        tyre.rotateX(QUARTER_TURN);
        tyre.translate(end * wheel.axle, wheel.radius, side * wheel.track);
        return tyre;
      }),
    ),
  );
}

export function carGeometry(): {
  body: BufferGeometry;
  glass: BufferGeometry;
  wheels: BufferGeometry;
} {
  return { body: bodyGeometry(), glass: glassGeometry(), wheels: wheelsGeometry() };
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
    partMesh(context, shedParts.trim, 'crossroads', WORLD_FINISHES.shedTrim),
    partMesh(context, shedParts.glass, 'crossroads', WORLD_FINISHES.carGlass),
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
