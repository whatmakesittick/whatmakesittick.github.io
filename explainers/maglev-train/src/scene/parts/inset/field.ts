import { Group, PlaneGeometry } from 'three';
import type { BufferGeometry, CanvasTexture, Mesh, MeshBasicMaterial } from 'three';
import type { PartContext } from '../context';
import { LAYER, OPACITY } from './constants';
import { insetMesh } from './insetMesh';
import { CONTENT, FIELD_WAVELENGTH_DRAWN, STATOR_DRAWING } from './layout';
import { fieldSpillTexture, fieldTexture } from './textures';

const WHITE = '#ffffff';
const SPILL_HEIGHT = 0.1;

export const FIELD_NAME = 'gapInsetField';

function bandMesh(
  context: PartContext,
  map: CanvasTexture,
  top: number,
  bottom: number,
): Mesh<BufferGeometry, MeshBasicMaterial> {
  map.repeat.x = CONTENT.width / FIELD_WAVELENGTH_DRAWN;
  const geometry = new PlaneGeometry(CONTENT.width, top - bottom);
  geometry.translate(0, (top + bottom) / 2, 0);
  return insetMesh(context, geometry, { colour: WHITE, map, opacity: OPACITY.field }, LAYER.field);
}

export class FieldBands {
  readonly group = new Group();
  private readonly maps: readonly CanvasTexture[];
  private readonly meshes: readonly Mesh<BufferGeometry, MeshBasicMaterial>[];

  constructor(context: PartContext) {
    const { top, bottom } = STATOR_DRAWING;
    const face = context.tracker.track(fieldTexture());
    const spill = context.tracker.track(fieldSpillTexture());
    this.maps = [face, spill];
    this.meshes = [
      bandMesh(context, face, top, bottom),
      bandMesh(context, spill, bottom, bottom - SPILL_HEIGHT),
    ];
    this.group.name = FIELD_NAME;
    this.group.add(...this.meshes);
  }

  scroll(offset: number): void {
    this.maps.forEach((map) => (map.offset.x = offset));
  }

  fade(strength: number): void {
    this.group.visible = strength > 0;
    this.meshes.forEach((mesh) => (mesh.material.opacity = OPACITY.field * strength));
  }
}
