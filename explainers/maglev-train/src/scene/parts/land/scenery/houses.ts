import { Color, PlaneGeometry } from 'three';
import type { InstancedMesh } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { between, pick, seededRandom } from '../random';
import type { Range } from '../random';
import type { PartContext } from '../../context';
import { periodicCopies } from './copies';
import { HOUSE_DESIGNS, houseGeometries } from './houseGeometry';
import { instanced } from './instances';
import type { Instance } from './instances';
import { HOUSE_KINDS } from './villagePlacement';
import type { HouseKind, HouseSpot, VillagePlan, YardSpot } from './villagePlacement';

const SEED_SCALE = 2 ** 31;
const YARD_LIFT = 0.06;
const QUARTER_TURN = Math.PI / 2;
const LIGHTNESS: Range = [0.94, 1.04];

const WALL_FINISH: MaterialFinish = {
  color: '#ffffff',
  vertexColors: true,
  roughness: 0.85,
  metalness: 0,
};
const ROOF_FINISH: MaterialFinish = {
  color: '#ffffff',
  vertexColors: true,
  roughness: 0.7,
  metalness: 0.05,
};
const YARD_FINISH: MaterialFinish = {
  color: '#ffffff',
  roughness: 0.95,
  metalness: 0,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
};

const WALL_TINTS = ['#efeae0', '#e6e1d6', '#f3efe8', '#ddd6c8', '#e9dfcf', '#d9d4cc'];
const ROOF_TINTS: Readonly<Record<HouseKind, readonly string[]>> = {
  villa: ['#4b5056', '#56483f', '#8b5945', '#47566a', '#4f5459'],
  house: ['#4b5056', '#7e5442', '#5b4c44', '#55606b'],
  workshop: ['#6d8197', '#8b939b', '#5b6f87', '#9a9c98'],
};
const YARD_TINTS = ['#b3ada0', '#a9a397', '#bdb7aa'];

function tinted(hex: string, random: () => number): Color {
  return new Color(hex).multiplyScalar(between(random, LIGHTNESS));
}

function houseScale(spot: HouseSpot): [number, number, number] {
  const [length, height, depth] = HOUSE_DESIGNS[spot.kind].size;
  return [spot.length / length, spot.height / height, spot.depth / depth];
}

function houseInstances(
  spots: readonly HouseSpot[],
  tints: (spot: HouseSpot) => readonly string[],
): Instance[] {
  return spots.map((spot) => {
    const random = seededRandom(Math.floor(spot.seed * SEED_SCALE));
    return {
      position: [spot.x, 0, spot.z],
      turn: spot.turn,
      scale: houseScale(spot),
      colour: tinted(pick(random, tints(spot)), random),
    };
  });
}

function yardInstances(yards: readonly YardSpot[]): Instance[] {
  const random = seededRandom(yards.length);
  return yards.map((yard) => ({
    position: [yard.x, YARD_LIFT, yard.z],
    turn: yard.turn,
    scale: [yard.length, 1, yard.depth],
    colour: tinted(pick(random, YARD_TINTS), random),
  }));
}

function yardGeometry(): PlaneGeometry {
  const geometry = new PlaneGeometry(1, 1);
  geometry.rotateX(-QUARTER_TURN);
  geometry.deleteAttribute('uv');
  return geometry;
}

export function buildHouses(
  context: PartContext,
  plan: VillagePlan,
  period: number,
  reach: number,
): InstancedMesh[] {
  const houses = periodicCopies(plan.houses, period, reach);
  const meshes = HOUSE_KINDS.flatMap((kind) => {
    const spots = houses.filter((spot) => spot.kind === kind);
    const { walls, roof } = houseGeometries(kind);
    return [
      instanced(
        context,
        walls,
        WALL_FINISH,
        houseInstances(spots, () => WALL_TINTS),
        `${kind}Walls`,
      ),
      instanced(
        context,
        roof,
        ROOF_FINISH,
        houseInstances(spots, (spot) => ROOF_TINTS[spot.kind]),
        `${kind}Roofs`,
      ),
    ];
  });
  const yards = periodicCopies(plan.yards, period, reach);
  return [
    ...meshes,
    instanced(context, yardGeometry(), YARD_FINISH, yardInstances(yards), 'yards'),
  ];
}
