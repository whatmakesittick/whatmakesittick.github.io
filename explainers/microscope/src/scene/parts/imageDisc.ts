import { CircleGeometry, DoubleSide, MeshBasicMaterial } from 'three';
import type { Mesh, Texture } from 'three';
import type { PartId } from '../../state';
import { QUARTER_TURN } from '../../turns';
import { RENDER_ORDER, SEGMENTS } from '../constants';
import { registeredMesh } from './context';
import type { PartContext } from './context';

const POLYGON_OFFSET = -2;

export function createImageDisc(
  context: PartContext,
  group: PartId,
  texture: Texture,
  height: number,
): Mesh {
  const geometry = new CircleGeometry(1, SEGMENTS.round).rotateX(-QUARTER_TURN);
  const material = new MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: POLYGON_OFFSET,
    polygonOffsetUnits: POLYGON_OFFSET,
  });
  const disc = registeredMesh(context, geometry, group, material);
  disc.position.y = height;
  disc.renderOrder = RENDER_ORDER.image;
  return disc;
}

export function setDiscRadius(disc: Mesh, radius: number): void {
  disc.scale.set(radius, 1, radius);
}
