import { MeshBasicMaterial, PlaneGeometry } from 'three';
import type { Mesh } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { BAY_TONES } from '../../../theme';
import { registeredMesh } from '../context';
import type { PartContext } from '../context';
import { CEILING_Y, HALL, WALL_REPEAT_M } from './dims';
import { width } from './surfaces';
import { wallTexture } from './textures';

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
