import { Color, Group, Matrix4, Path } from 'three';
import type { BufferGeometry, ColorRepresentation, InstancedMesh, Object3D } from 'three';
import { FULL_TURN } from '@core/math';
import { box } from '@core/scene/geometry/box';
import { extrudePlan, planShape } from '@core/scene/geometry/extrude';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { DRILL_FLOOR_Y, tubularRadius } from '../../../model/scale';
import { SECTIONS } from '../../../model/wellPlan';
import { DECK_ITEMS, DRILL_FLOOR, HULL, STAND_LENGTH_M } from '../../constants';
import { PAINT } from '../../finishes';
import { barGeometry, barMatrix, unitRod } from '../../geometry/bars';
import type { Point } from '../../geometry/bars';
import { mergePainted, paintByNormal } from '../../geometry/merge';
import { tubeGeometry } from '../../geometry/tubes';
import { instancedMesh, partMesh } from '../context';
import type { PartContext } from '../context';

export interface DrillFloorPart {
  object: Group;
  anchor: Object3D;
}

interface Rod {
  from: Point;
  to: Point;
  radius: number;
  color: ColorRepresentation;
}

const FLOOR_BOTTOM = DRILL_FLOOR_Y - DRILL_FLOOR.thickness;
const ROTARY_MARGIN = 0.25;
const ROTARY_RIM = 1.3;
const ROTARY_RAISE = 0.12;
const HOLE_SEGMENTS = 40;
const CATWALK_THICKNESS = 0.5;
const DOGHOUSE = {
  minX: -8.6,
  maxX: -3.2,
  minZ: 5.4,
  maxZ: 8.8,
  height: 3.4,
  band: 1,
  fromTop: 0.6,
  inset: 0.1,
} as const;
const PIPE_LENGTH = 11;
const RISER_JOINT_LENGTH = 22.8;
const SETBACK_CLUSTER = { x: -3.7, z: 1.7 } as const;

export function rotaryRadius(): number {
  const widest = Math.max(...SECTIONS.map((section) => section.holeInches));
  return tubularRadius(widest) + ROTARY_MARGIN;
}

function floorPlate(): BufferGeometry {
  const { halfX, halfZ } = DRILL_FLOOR;
  const outline = planShape([
    { x: -halfX, z: -halfZ },
    { x: halfX, z: -halfZ },
    { x: halfX, z: halfZ },
    { x: -halfX, z: halfZ },
  ]);
  outline.holes.push(new Path().absarc(0, 0, rotaryRadius(), 0, FULL_TURN, true));
  const plate = extrudePlan(outline, FLOOR_BOTTOM, DRILL_FLOOR_Y);
  return paintByNormal(plate, { top: PAINT.darkSteel, side: PAINT.trim, bottom: PAINT.trim });
}

function rotaryRing(): BufferGeometry {
  const radius = rotaryRadius();
  return tubeGeometry({
    outer: radius + ROTARY_RIM,
    inner: radius,
    bottom: DRILL_FLOOR_Y,
    top: DRILL_FLOOR_Y + ROTARY_RAISE,
    segments: HOLE_SEGMENTS,
  });
}

function substructure(): BufferGeometry[] {
  const { legInsetX, legInsetZ, leg } = DRILL_FLOOR;
  const deck = HULL.deck.top;
  const corners: Point[] = [
    [legInsetX, 0, legInsetZ],
    [-legInsetX, 0, legInsetZ],
    [-legInsetX, 0, -legInsetZ],
    [legInsetX, 0, -legInsetZ],
  ];
  const legs = corners.map(([x, , z]) => barGeometry([x, deck, z], [x, FLOOR_BOTTOM, z], leg));
  const braces = corners.flatMap(([x, , z], index) => {
    const [nx, , nz] = corners[(index + 1) % corners.length];
    return [
      barGeometry([x, deck, z], [nx, FLOOR_BOTTOM, nz], leg / 2),
      barGeometry([nx, deck, nz], [x, FLOOR_BOTTOM, z], leg / 2),
    ];
  });
  return [...legs, ...braces];
}

function catwalk(): BufferGeometry {
  const { width, fromX, toX, bottomY } = DECK_ITEMS.catwalk;
  return barGeometry(
    [fromX, DRILL_FLOOR_Y - CATWALK_THICKNESS / 2, 0],
    [toX, bottomY, 0],
    CATWALK_THICKNESS,
    width,
  );
}

function doghouse(): (readonly [BufferGeometry, ColorRepresentation])[] {
  const { minX, maxX, minZ, maxZ, height, band, fromTop, inset } = DOGHOUSE;
  const roof = DRILL_FLOOR_Y + height;
  const body = box({ minX, maxX, minY: DRILL_FLOOR_Y, maxY: roof, minZ, maxZ });
  const windows = box({
    minX: minX - inset,
    maxX: maxX + inset,
    minY: roof - fromTop - band,
    maxY: roof - fromTop,
    minZ: minZ - inset,
    maxZ: maxZ + inset,
  });
  return [
    [body, PAINT.white],
    [windows, PAINT.glass],
  ];
}

function setbackRods(): Rod[] {
  const { rows, columns, radius, spacing, lean } = DECK_ITEMS.setback;
  const bottom = DRILL_FLOOR_Y + ROTARY_RAISE;
  const top = bottom + STAND_LENGTH_M;
  return [1, -1].flatMap((side) =>
    Array.from({ length: rows * columns }, (_, index): Rod => {
      const x = SETBACK_CLUSTER.x + (index % columns) * spacing;
      const z = side * (SETBACK_CLUSTER.z + Math.floor(index / columns) * spacing);
      return {
        from: [x, bottom, z],
        to: [x - lean, top, z],
        radius,
        color: PAINT.stand,
      };
    }),
  );
}

function pipeDeckRods(): Rod[] {
  const { minX, minZ, maxZ, layers, perLayer, radius } = DECK_ITEMS.pipeDeck;
  const spacing = (maxZ - minZ) / perLayer;
  return Array.from({ length: layers * perLayer }, (_, index): Rod => {
    const layer = Math.floor(index / perLayer);
    const z = minZ + (index % perLayer) * spacing + (layer % 2) * (spacing / 2);
    const y = HULL.deck.top + radius + layer * radius * 1.8;
    return { from: [minX, y, z], to: [minX + PIPE_LENGTH, y, z], radius, color: PAINT.steel };
  });
}

function riserRackRods(): Rod[] {
  const { minX, minZ, rows, perRow, radius } = DECK_ITEMS.riserRack;
  return Array.from({ length: rows * perRow }, (_, index): Rod => {
    const row = Math.floor(index / perRow);
    const z = minZ + radius + (index % perRow) * radius * 2.1 + row * radius;
    const y = HULL.deck.top + radius + row * radius * 1.8;
    const to: Point = [minX + RISER_JOINT_LENGTH, y, z];
    return { from: [minX, y, z], to, radius, color: PAINT.buoyancy };
  });
}

function rodInstances(
  context: PartContext,
  rods: Rod[],
  group: 'drillFloor' | typeof STRUCTURE_GROUP,
): InstancedMesh {
  const mesh = instancedMesh(context, unitRod(), group, 'instanced', rods.length);
  const matrix = new Matrix4();
  const color = new Color();
  rods.forEach((rod, index) => {
    mesh.setMatrixAt(index, barMatrix(rod.from, rod.to, rod.radius * 2, matrix));
    mesh.setColorAt(index, color.set(rod.color));
  });
  mesh.computeBoundingSphere();
  return mesh;
}

export function createDrillFloor(context: PartContext): DrillFloorPart {
  const object = new Group();
  const floor = mergePainted([
    [rotaryRing(), PAINT.black],
    [catwalk(), PAINT.safetyYellow],
    ...substructure().map((part) => [part, PAINT.trim] as const),
    ...doghouse(),
  ]);
  object.add(
    partMesh(context, floorPlate(), 'drillFloor', 'painted'),
    partMesh(context, floor, 'drillFloor', 'painted'),
    rodInstances(context, setbackRods(), 'drillFloor'),
    rodInstances(context, [...pipeDeckRods(), ...riserRackRods()], STRUCTURE_GROUP),
  );
  return { object, anchor: anchorAt(object, 0, DRILL_FLOOR_Y, DRILL_FLOOR.halfZ) };
}
