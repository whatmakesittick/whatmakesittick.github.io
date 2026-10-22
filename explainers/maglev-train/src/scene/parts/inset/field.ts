import { PlaneGeometry } from 'three';
import type { BufferGeometry, CanvasTexture, Mesh, MeshBasicMaterial } from 'three';
import type { PartContext } from '../context';
import { LAYER, OPACITY } from './constants';
import { insetMesh } from './insetMesh';
import { CONTENT, FIELD_WAVELENGTH_DRAWN, STATOR_DRAWING } from './layout';
import { fieldTexture } from './textures';

const WHITE = '#ffffff';

export const FIELD_NAME = 'gapInsetField';

export class FieldBands {
  readonly mesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly map: CanvasTexture;

  constructor(context: PartContext) {
    const { top, bottom } = STATOR_DRAWING;
    this.map = context.tracker.track(fieldTexture());
    this.map.repeat.x = CONTENT.width / FIELD_WAVELENGTH_DRAWN;
    const geometry = new PlaneGeometry(CONTENT.width, top - bottom);
    geometry.translate(0, (top + bottom) / 2, 0);
    const look = { colour: WHITE, map: this.map, opacity: OPACITY.field };
    this.mesh = insetMesh(context, geometry, look, LAYER.field);
    this.mesh.name = FIELD_NAME;
  }

  scroll(offset: number): void {
    this.map.offset.x = offset;
  }

  fade(strength: number): void {
    this.mesh.visible = strength > 0;
    this.mesh.material.opacity = OPACITY.field * strength;
  }
}
