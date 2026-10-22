import { Group, PlaneGeometry } from 'three';
import type { CanvasTexture, Mesh } from 'three';
import type { PartContext } from '../context';
import { INK, LAYER, OPACITY } from './constants';
import { insetMesh } from './insetMesh';
import { CONTENT, FIELD_WAVELENGTH_DRAWN, MAGNET_DRAWING } from './layout';
import { fadeTexture, magnetBodyTexture, poleTexture } from './textures';

const WHITE = '#ffffff';
const BODY_TILE = 0.12;
const FADE_HEIGHT = 0.5;

export const POLES_NAME = 'gapInsetPoles';

function stripMesh(context: PartContext, map: CanvasTexture, height: number, layer: number): Mesh {
  map.repeat.x = CONTENT.width / FIELD_WAVELENGTH_DRAWN;
  const geometry = new PlaneGeometry(CONTENT.width, height);
  geometry.translate(0, -height / 2, 0);
  return insetMesh(context, geometry, { colour: WHITE, map }, layer);
}

function fadeMesh(context: PartContext): Mesh {
  const map = context.tracker.track(fadeTexture());
  const geometry = new PlaneGeometry(CONTENT.width, FADE_HEIGHT);
  geometry.translate(0, CONTENT.bottom + FADE_HEIGHT / 2, 0);
  const look = { colour: INK.fade, map, opacity: OPACITY.fade };
  return insetMesh(context, geometry, look, LAYER.magnetFade);
}

export class MagnetDrawing {
  readonly group = new Group();
  private readonly poleMap: CanvasTexture;
  private readonly bodyMap: CanvasTexture;
  private readonly poles: Mesh;
  private readonly body: Mesh;

  constructor(context: PartContext) {
    this.poleMap = context.tracker.track(poleTexture());
    this.bodyMap = context.tracker.track(magnetBodyTexture());
    this.poles = stripMesh(context, this.poleMap, MAGNET_DRAWING.poleStrip, LAYER.poles);
    this.poles.name = POLES_NAME;
    this.body = stripMesh(context, this.bodyMap, 1, LAYER.magnetBody);
    this.group.add(this.body, fadeMesh(context), this.poles);
  }

  place(top: number): void {
    const bodyTop = top - MAGNET_DRAWING.poleStrip;
    const height = Math.max(bodyTop - CONTENT.bottom, 0);
    this.poles.position.y = top;
    this.body.position.y = bodyTop;
    this.body.scale.y = height;
    this.body.visible = height > 0;
    this.bodyMap.repeat.y = height / BODY_TILE;
    this.bodyMap.offset.y = -this.bodyMap.repeat.y;
  }

  scroll(offset: number): void {
    this.poleMap.offset.x = offset;
    this.bodyMap.offset.x = offset;
  }
}
