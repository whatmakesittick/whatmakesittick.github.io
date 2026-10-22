import { NoColorSpace } from 'three';
import type { CanvasTexture, Texture } from 'three';
import { canvasTexture } from '../../canvasTexture';
import type { CanvasLook } from '../../canvasTexture';
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
import { paintLineShade } from './paintShadows';
import type { AxisWarp } from './warp';

export interface GroundPlan {
  readonly fields: readonly Field[];
  readonly linears: readonly Linear[];
  readonly warp: AxisWarp;
}

export interface GroundMaps {
  readonly colour: Texture;
  readonly roughness: Texture;
  readonly shade: Texture;
}

function groundTexture(
  context: PartContext,
  size: number,
  warp: AxisWarp,
  paint: (painter: Painter) => void,
  look: CanvasLook = {},
): CanvasTexture {
  const texture = canvasTexture(
    size,
    size,
    (drawing) =>
      paint({ context: drawing, width: size, height: size, period: GROUND.period, warp }),
    { anisotropy: GROUND.texture.anisotropy, ...look },
  );
  return context.tracker.track(texture);
}

function paintColour(painter: Painter, plan: GroundPlan): void {
  paintFields(painter, plan.fields);
  paintCorridor(painter);
  paintLinears(painter, plan.linears);
  paintMottle(painter);
}

export function groundMaps(context: PartContext, plan: GroundPlan): GroundMaps {
  const { size, roughSize, shadeSize } = GROUND.texture;
  return {
    colour: groundTexture(context, size, plan.warp, (painter) => paintColour(painter, plan)),
    roughness: groundTexture(
      context,
      roughSize,
      plan.warp,
      (painter) => paintRoughness(painter, plan.fields, plan.linears),
      { colorSpace: NoColorSpace },
    ),
    shade: groundTexture(context, shadeSize, plan.warp, paintLineShade),
  };
}
