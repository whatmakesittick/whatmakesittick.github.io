import { Group } from 'three';
import type { Mesh } from 'three';
import type { PartContext } from '../context';
import { INK, LAYER, OPACITY } from './constants';
import { contentStrip, insetMesh, patternStrip } from './insetMesh';
import type { InsetPart } from './insetMesh';
import { CONTENT, MAGNET_DRAWING } from './layout';
import { fadeTexture, magnetBodyTexture, poleTexture } from './textures';

const BODY_TILE = 0.12;
const FADE_HEIGHT = 0.5;
const UNIT_STRIP = [0, -1] as const;

export const POLES_NAME = 'gapInsetPoles';

function fadeMesh(context: PartContext): Mesh {
  const map = context.tracker.track(fadeTexture());
  const geometry = contentStrip(FADE_HEIGHT, CONTENT.bottom + FADE_HEIGHT / 2);
  const look = { colour: INK.fade, map, opacity: OPACITY.fade };
  return insetMesh(context, geometry, look, LAYER.magnetFade);
}

export function magnetDrawing(context: PartContext): InsetPart<[top: number, offset: number]> {
  const poleMap = context.tracker.track(poleTexture());
  const bodyMap = context.tracker.track(magnetBodyTexture());
  const poles = patternStrip(context, poleMap, [0, -MAGNET_DRAWING.poleStrip], LAYER.poles);
  poles.name = POLES_NAME;
  const body = patternStrip(context, bodyMap, UNIT_STRIP, LAYER.magnetBody);
  const group = new Group();
  group.add(body, fadeMesh(context), poles);
  return {
    group,
    draw(top, offset) {
      const bodyTop = top - MAGNET_DRAWING.poleStrip;
      const height = Math.max(bodyTop - CONTENT.bottom, 0);
      poles.position.y = top;
      body.position.y = bodyTop;
      body.scale.y = height;
      body.visible = height > 0;
      bodyMap.repeat.y = height / BODY_TILE;
      bodyMap.offset.set(offset, -bodyMap.repeat.y);
      poleMap.offset.x = offset;
    },
  };
}
