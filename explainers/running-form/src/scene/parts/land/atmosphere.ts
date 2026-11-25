import { Color, ShaderMaterial, Vector2 } from 'three';
import type { IUniform, ShaderMaterialParameters } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { THEME } from '../../../theme';
import { SUN_VECTOR } from '../../sun';
import { registered } from '../context';
import type { PartContext } from '../context';

export const SKY_COLOURS = {
  top: THEME.skyTop,
  horizon: '#f0b98a',
  away: '#a7b0c8',
  glow: '#ffc27a',
} as const;

const HAZE = { distanceM: 2400, fullM: 2700 } as const;

const LIGHT = {
  sun: { color: '#ffbf80', intensity: 5.6 },
  sky: { color: '#8ea8d0', intensity: 0.78 },
  bounce: { color: '#a58b68', intensity: 0.5 },
} as const;

type Uniforms = Record<string, IUniform>;

function scaled(hex: string, intensity: number): Color {
  return new Color(hex).multiplyScalar(intensity);
}

export function atmosphereUniforms(): Uniforms {
  return {
    uSunDir: { value: SUN_VECTOR },
    uSkyTop: { value: new Color(SKY_COLOURS.top) },
    uSkyHorizon: { value: new Color(SKY_COLOURS.horizon) },
    uSkyAway: { value: new Color(SKY_COLOURS.away) },
    uSunGlow: { value: new Color(SKY_COLOURS.glow) },
    uHaze: { value: new Vector2(HAZE.distanceM, HAZE.fullM) },
    uSunLight: { value: scaled(LIGHT.sun.color, LIGHT.sun.intensity) },
    uSkyLight: { value: scaled(LIGHT.sky.color, LIGHT.sky.intensity) },
    uBounceLight: { value: scaled(LIGHT.bounce.color, LIGHT.bounce.intensity) },
  };
}

export interface Backdrop {
  readonly context: PartContext;
  readonly shared: Uniforms;
  readonly scroll: IUniform<number>;
}

export function createBackdrop(context: PartContext): Backdrop {
  return { context, shared: atmosphereUniforms(), scroll: { value: 0 } };
}

export function backdropMaterial(
  backdrop: Backdrop,
  uniforms: Uniforms,
  parameters: ShaderMaterialParameters,
): ShaderMaterial {
  return registered(
    backdrop.context,
    UNDIMMED_GROUP,
    new ShaderMaterial({
      ...parameters,
      uniforms: { ...backdrop.shared, uScroll: backdrop.scroll, ...uniforms },
      fog: false,
    }),
  );
}

export function colour(hex: string, intensity = 1): IUniform<Color> {
  return { value: scaled(hex, intensity) };
}
