import { MeshBasicMaterial, PlaneGeometry } from 'three';
import type { Mesh } from 'three';
import { STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import { BAY_TONES } from '../../../theme';
import { registeredMesh } from '../context';
import type { PartContext } from '../context';
import { CEILING_Y, HALL, WALL_REPEAT_M, WALL_WINDOWS } from './dims';
import { width } from './surfaces';
import { wallTexture, windowTexture } from './textures';

const ALPHA_CUT = 0.5;

export function buildWall(context: PartContext): Mesh {
  const span = width(HALL);
  const geometry = new PlaneGeometry(span, CEILING_Y).translate(
    (HALL.minX + HALL.maxX) / 2,
    CEILING_Y / 2,
    HALL.minZ,
  );
  const texture = wallTexture(context);
  texture.repeat.set(span / WALL_REPEAT_M, 1);
  const material = new MeshBasicMaterial({
    color: BAY_TONES.wall,
    map: texture,
    toneMapped: false,
  });
  const wall = registeredMesh(context, geometry, STRUCTURE_GROUP, material);
  wall.name = 'wall';
  return wall;
}

export function buildWindows(context: PartContext): Mesh {
  const { reach, pitch, height, y, proud } = WALL_WINDOWS;
  const geometry = new PlaneGeometry(reach * 2, height).translate(0, y, HALL.minZ + proud);
  const texture = windowTexture(context);
  texture.repeat.set((reach * 2) / pitch, 1);
  const material = new MeshBasicMaterial({
    color: BAY_TONES.window,
    map: texture,
    alphaTest: ALPHA_CUT,
    toneMapped: false,
  });
  const windows = registeredMesh(context, geometry, UNDIMMED_GROUP, material);
  windows.name = 'windows';
  return windows;
}
