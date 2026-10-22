import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three';
import type { Texture } from 'three';
import type { PartContext } from '../../context';
import { GROUND } from '../constants';
import type { Field } from './fields';
import type { Linear } from './linears';
import { paintCorridor } from './paintCorridor';
import { paintFields } from './paintFields';
import { paintLinears } from './paintLinears';
import { paintMottle } from './mottle';
import type { Painter } from './painter';
import { paintRoughness } from './roughness';
import { paintShadows } from './paintShadows';
import type { AxisWarp } from './warp';

export interface GroundPlan {
  readonly fields: readonly Field[];
  readonly linears: readonly Linear[];
  readonly warp: AxisWarp;
}

export interface GroundMaps {
  readonly colour: Texture;
  readonly roughness: Texture;
}

function canvasTexture(
  context: PartContext,
  size: number,
  warp: AxisWarp,
  paint: (painter: Painter) => void,
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const drawing = canvas.getContext('2d');
  if (drawing) paint({ context: drawing, width: size, height: size, period: GROUND.period, warp });
  const texture = context.tracker.track(new CanvasTexture(canvas));
  texture.wrapS = RepeatWrapping;
  texture.anisotropy = GROUND.texture.anisotropy;
  return texture;
}

function paintColour(painter: Painter, plan: GroundPlan): void {
  paintFields(painter, plan.fields);
  paintCorridor(painter);
  paintLinears(painter, plan.linears);
  paintShadows(painter);
  paintMottle(painter);
}

export function groundMaps(context: PartContext, plan: GroundPlan): GroundMaps {
  const { size, roughSize } = GROUND.texture;
  const colour = canvasTexture(context, size, plan.warp, (painter) => paintColour(painter, plan));
  colour.colorSpace = SRGBColorSpace;
  const roughness = canvasTexture(context, roughSize, plan.warp, (painter) =>
    paintRoughness(painter, plan.fields, plan.linears),
  );
  roughness.colorSpace = NoColorSpace;
  return { colour, roughness };
}
