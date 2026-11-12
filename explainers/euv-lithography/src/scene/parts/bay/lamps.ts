import { Color, InstancedMesh, Matrix4, MeshBasicMaterial, PlaneGeometry } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { HALL, LAMP, WALL_LAMPS } from './dims';
import { GLOW, LAMP_TONES } from './finishes';
import type { RowSwitch } from './rows';
import { NOMINAL, toolScale } from './tools';
import type { ToolSpot } from './tools';

type LampTone = keyof typeof LAMP_TONES;

export interface LampSpot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly tone: LampTone;
  readonly row?: number;
}

const TOWER: readonly LampTone[][] = [
  ['off', 'off', 'run'],
  ['off', 'off', 'run'],
  ['off', 'idle', 'off'],
  ['off', 'off', 'run'],
  ['off', 'off', 'info'],
  ['off', 'off', 'run'],
  ['alarm', 'off', 'off'],
];
const WALL_PATTERN: readonly LampTone[][] = [
  ['run', 'off'],
  ['idle', 'run'],
  ['run'],
  ['info', 'run', 'off'],
];

function towerSpots(spot: ToolSpot, index: number): LampSpot[] {
  const scale = toolScale(spot);
  const x = spot.x + (NOMINAL.bodyRight - LAMP.inset) * scale.x;
  const top = NOMINAL.bodyTop * scale.y - LAMP.lift;
  return TOWER[index % TOWER.length].map((tone, step) => ({
    x,
    y: top - step * LAMP.pitch,
    z: spot.frontZ + LAMP.proud,
    tone,
    row: spot.row,
  }));
}

function wallSpots(): LampSpot[] {
  const spots: LampSpot[] = [];
  const z = HALL.minZ + WALL_LAMPS.proud;
  let group = 0;
  for (let x = -WALL_LAMPS.reach; x <= WALL_LAMPS.reach; x += WALL_LAMPS.pitch) {
    const pattern = WALL_PATTERN[group % WALL_PATTERN.length];
    pattern.forEach((tone, step) => {
      spots.push({ x: x + step * LAMP.pitch * 1.4, y: WALL_LAMPS.height, z, tone });
    });
    group += 1;
  }
  return spots;
}

export function lampSpots(tools: readonly ToolSpot[]): LampSpot[] {
  return [...tools.flatMap(towerSpots), ...wallSpots()];
}

function lampColour(tone: LampTone): Color {
  const colour = new Color(LAMP_TONES[tone]);
  return tone === 'off' ? colour : colour.multiplyScalar(GLOW.lamp);
}

export function buildLamps(
  context: PartContext,
  spots: readonly LampSpot[],
  rows: RowSwitch,
): InstancedMesh {
  const material = registeredMaterial(
    context,
    UNDIMMED_GROUP,
    new MeshBasicMaterial({ toneMapped: false }),
  );
  const mesh = context.tracker.track(
    new InstancedMesh(context.tracker.track(new PlaneGeometry(1, 1)), material, spots.length),
  );
  spots.forEach((spot, index) => {
    const matrix = new Matrix4()
      .makeScale(LAMP.size, LAMP.size * 0.8, 1)
      .setPosition(spot.x, spot.y, spot.z);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, lampColour(spot.tone));
    if (spot.row !== undefined) rows.add(mesh, spot.row, index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = 'lamps';
  return mesh;
}
