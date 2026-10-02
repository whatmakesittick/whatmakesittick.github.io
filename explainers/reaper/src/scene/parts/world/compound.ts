import { ConeGeometry, CylinderGeometry, Group, PlaneGeometry, SphereGeometry } from 'three';
import type { BufferGeometry, Material, Mesh, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { anchorAt } from '@core/scene/parts';
import { TARGET } from '../../../model/layout';
import { COMPOUND } from '../../constants';
import { WORLD_FINISHES } from '../../finishes';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

type Triple = readonly [number, number, number];

const QUARTER_TURN = Math.PI / 2;
const FULL_TURN = Math.PI * 2;
const AXLE_ENDS = [-1, 1] as const;

function boxAt(at: Triple, size: Triple): BufferGeometry {
  return box({
    minX: at[0] - size[0] / 2,
    maxX: at[0] + size[0] / 2,
    minY: at[1],
    maxY: at[1] + size[1],
    minZ: at[2] - size[2] / 2,
    maxZ: at[2] + size[2] / 2,
  });
}

function wallGeometry(): BufferGeometry {
  const [width, depth] = COMPOUND.yard.size;
  const { height, thickness, gate } = COMPOUND.wall;
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const side = (width - gate) / 2;
  return mergeParts([
    boxAt([0, 0, halfDepth], [width + thickness, height, thickness]),
    boxAt([halfWidth, 0, 0], [thickness, height, depth]),
    boxAt([-halfWidth, 0, 0], [thickness, height, depth]),
    boxAt([-halfWidth + side / 2, 0, -halfDepth], [side, height, thickness]),
    boxAt([halfWidth - side / 2, 0, -halfDepth], [side, height, thickness]),
  ]);
}

function buildingGeometry(): {
  walls: BufferGeometry;
  roofs: BufferGeometry;
  openings: BufferGeometry;
} {
  const { door, window, depth, shift } = COMPOUND.openings;
  const walls: BufferGeometry[] = [];
  const roofs: BufferGeometry[] = [];
  const openings: BufferGeometry[] = [];
  for (const { at, size, parapet } of COMPOUND.buildings) {
    walls.push(boxAt(at, size));
    roofs.push(
      boxAt([at[0], at[1] + size[1], at[2]], [size[0] + parapet, parapet, size[2] + parapet]),
    );
    const front = at[2] - size[2] / 2 - depth / 2;
    openings.push(boxAt([at[0] - size[0] * shift, 0, front], [door.width, door.height, depth]));
    openings.push(
      boxAt([at[0] + size[0] * shift, window.sill, front], [window.width, window.height, depth]),
    );
  }
  return { walls: mergeParts(walls), roofs: mergeParts(roofs), openings: mergeParts(openings) };
}

function vehicleGeometry(): {
  body: BufferGeometry;
  glass: BufferGeometry;
  wheels: BufferGeometry;
} {
  const { body, cab, bedShift, cabShift, glass, wheel, clearance } = COMPOUND.vehicle;
  const cabX = body[0] * cabShift;
  const roofline = clearance + body[1];
  const bed = boxAt([body[0] * bedShift, clearance, 0], body);
  const cabin = boxAt([cabX, roofline, 0], cab);
  const windscreen = boxAt(
    [cabX + cab[0] / 2, roofline + glass.lift, 0],
    [glass.thickness, cab[1] * glass.height, cab[2] * glass.width],
  );
  const wheels = AXLE_ENDS.flatMap((end) =>
    AXLE_ENDS.map((side) => {
      const tyre = new CylinderGeometry(wheel.radius, wheel.radius, wheel.width, wheel.segments);
      tyre.rotateX(QUARTER_TURN);
      tyre.translate(
        end * body[0] * wheel.axle,
        wheel.radius,
        side * (body[2] / 2 - wheel.width * wheel.inset),
      );
      return tyre;
    }),
  );
  return { body: mergeParts([bed, cabin]), glass: windscreen, wheels: mergeParts(wheels) };
}

function frond(top: Triple, index: number): BufferGeometry {
  const { count, length, width, droop, flatten, segments } = COMPOUND.palm.fronds;
  const leaf = new ConeGeometry(width, length, segments);
  leaf.scale(1, 1, flatten);
  leaf.translate(0, length / 2, 0);
  leaf.rotateZ(-QUARTER_TURN - droop);
  leaf.rotateY((index / count) * FULL_TURN);
  leaf.translate(...top);
  return leaf;
}

function palmGeometry(): { trunk: BufferGeometry; crown: BufferGeometry } {
  const { spots, trunk, fronds, heart } = COMPOUND.palm;
  const trunks: BufferGeometry[] = [];
  const crowns: BufferGeometry[] = [];
  for (const [x, , z] of spots) {
    const stem = new CylinderGeometry(
      trunk.radius[0],
      trunk.radius[1],
      trunk.height,
      trunk.segments,
    );
    stem.translate(0, trunk.height / 2, 0);
    stem.rotateZ(trunk.lean);
    stem.translate(x, 0, z);
    trunks.push(stem);
    const top: Triple = [
      x - Math.sin(trunk.lean) * trunk.height,
      Math.cos(trunk.lean) * trunk.height,
      z,
    ];
    for (let index = 0; index < fronds.count; index += 1) crowns.push(frond(top, index));
    const core = new SphereGeometry(heart.radius, heart.segments, heart.segments / 2);
    core.translate(...top);
    crowns.push(core);
  }
  return { trunk: mergeParts(trunks), crown: mergeParts(crowns) };
}

export class CompoundPart {
  readonly object = new Group();
  readonly anchor: Object3D;
  readonly vehicle = new Group();
  private readonly vehicleBody: Mesh;
  private readonly paint: Material;
  private readonly charred: Material;

  constructor(context: PartContext) {
    const { centre, yard, vehicle: spec } = COMPOUND;
    this.object.position.set(...centre);
    const ground = new PlaneGeometry(...yard.size);
    ground.rotateX(-QUARTER_TURN);
    ground.translate(0, yard.lift, 0);
    const buildings = buildingGeometry();
    const palms = palmGeometry();
    const vehicle = vehicleGeometry();
    this.paint = context.materials.get('target', WORLD_FINISHES.vehicle);
    this.charred = context.materials.get('target', WORLD_FINISHES.charred);
    this.vehicleBody = partMesh(context, vehicle.body, 'target', WORLD_FINISHES.vehicle);
    this.vehicle.position.set(TARGET[0] - centre[0], 0, TARGET[2] - centre[2]);
    this.vehicle.rotation.y = spec.heading;
    this.vehicle.add(
      this.vehicleBody,
      partMesh(context, vehicle.glass, 'target', WORLD_FINISHES.vehicleGlass),
      partMesh(context, vehicle.wheels, 'target', WORLD_FINISHES.charred),
    );
    this.object.add(
      partMesh(context, ground, 'target', WORLD_FINISHES.yard),
      partMesh(context, wallGeometry(), 'target', WORLD_FINISHES.wall),
      partMesh(context, buildings.walls, 'target', WORLD_FINISHES.building),
      partMesh(context, buildings.roofs, 'target', WORLD_FINISHES.roof),
      partMesh(context, buildings.openings, 'target', WORLD_FINISHES.door),
      partMesh(context, palms.trunk, 'target', WORLD_FINISHES.trunk),
      partMesh(context, palms.crown, 'target', WORLD_FINISHES.palm),
      this.vehicle,
    );
    this.anchor = anchorAt(this.vehicle, 0, spec.labelLift, 0);
  }

  setHit(hit: boolean): void {
    this.vehicleBody.material = hit ? this.charred : this.paint;
  }
}
