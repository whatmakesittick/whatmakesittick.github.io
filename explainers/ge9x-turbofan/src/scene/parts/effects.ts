import {
  AdditiveBlending,
  Color,
  CustomBlending,
  DoubleSide,
  NormalBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  ShaderMaterial,
  Vector2,
} from 'three';
import type { IUniform, Intersection } from 'three';
import { isMesh } from '@core/scene/occlusion';
import { AXIS_HEIGHT_M } from '../../model/scale';
import { THEME } from '../../theme';
import { EFFECT_LOOK, LOOK } from '../constants';
import { CUT_ANGLE_GLSL } from './cut';
import type { CutUniforms } from './cut';
import { HEAT_RAMP_GLSL } from './heat';
import type { GlowScale, HeatUniforms } from './heat';
import { glslFloat } from './shaderChunks';

export interface TimeUniform {
  readonly uTime: IUniform<number>;
}

const CUT_VERTEX = /* glsl */ `
varying vec3 vWorld;
`;

const CUT_FRAGMENT = /* glsl */ `
uniform float uCutHalf;
varying vec3 vWorld;
${CUT_ANGLE_GLSL}
bool cutAway() {
  return uCutHalf > 0.0 && abs(cutAngleAt(vWorld)) < uCutHalf;
}
`;

const NOISE = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
`;

function blend() {
  return {
    transparent: true,
    depthWrite: false,
    blending: LOOK.additive ? AdditiveBlending : NormalBlending,
  };
}

export function isGlowHit({ object }: Intersection): boolean {
  if (!isMesh(object) || Array.isArray(object.material)) return false;
  return (
    object.material instanceof ShaderMaterial &&
    object.material.transparent &&
    !object.material.depthWrite
  );
}

function finishColor(name: string): string {
  return `gl_FragColor = ${name};`;
}

const OUTPUT = /* glsl */ `
#include <tonemapping_fragment>
#include <colorspace_fragment>
`;

export function createTime(): TimeUniform {
  return { uTime: { value: 0 } };
}

export function glowVolumeMaterial(
  heat: HeatUniforms,
  scale: GlowScale,
  cut: CutUniforms,
  time: TimeUniform,
): ShaderMaterial {
  return new ShaderMaterial({
    ...blend(),
    side: DoubleSide,
    uniforms: {
      uHeat: heat.uHeat,
      uGlowScale: scale.uGlowScale,
      uCutHalf: cut.uCoreHalf,
      uCutCentre: cut.uCoreCentre,
      uTime: time.uTime,
    },
    vertexShader: /* glsl */ `
      attribute float heatProfile;
      varying float vProfile;
      ${CUT_VERTEX}
      void main() {
        vProfile = heatProfile;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uHeat;
      uniform float uGlowScale;
      uniform float uTime;
      varying float vProfile;
      ${CUT_FRAGMENT}
      ${HEAT_RAMP_GLSL}
      ${NOISE}
      void main() {
        if (cutAway()) discard;
        float heat = clamp(vProfile * uHeat, 0.0, 1.0);
        float angle = atan(vWorld.y - ${glslFloat(AXIS_HEIGHT_M)}, vWorld.z);
        float flicker = valueNoise(vec2(vWorld.x * 9.0 - uTime * 3.0, angle * 6.0 + uTime));
        float alpha = ${glslFloat(EFFECT_LOOK.gasAlpha)} * pow(heat, 0.7) * (0.6 + 0.6 * flicker) * uGlowScale;
        vec4 color = vec4(heatRamp(min(1.0, heat * 1.1)), clamp(alpha, 0.0, 1.0));
        ${finishColor('color')}
        ${OUTPUT}
      }
    `,
  });
}

export function haloMaterial(
  heat: HeatUniforms,
  scale: GlowScale,
  cut: CutUniforms,
): ShaderMaterial {
  return new ShaderMaterial({
    ...blend(),
    side: DoubleSide,
    uniforms: {
      uHeat: heat.uHeat,
      uGlowScale: scale.uGlowScale,
      uCutHalf: cut.uCoreHalf,
      uCutCentre: cut.uCoreCentre,
    },
    vertexShader: /* glsl */ `
      attribute float heatProfile;
      varying float vProfile;
      varying float vFacing;
      ${CUT_VERTEX}
      void main() {
        vProfile = heatProfile;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 view = viewMatrix * world;
        vFacing = abs(dot(normalize(normalMatrix * normal), normalize(-view.xyz)));
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uHeat;
      uniform float uGlowScale;
      varying float vProfile;
      varying float vFacing;
      ${CUT_FRAGMENT}
      ${HEAT_RAMP_GLSL}
      void main() {
        if (cutAway()) discard;
        float heat = clamp(vProfile * uHeat, 0.0, 1.0);
        float alpha = ${glslFloat(EFFECT_LOOK.haloAlpha)} * pow(heat, 1.3) * pow(vFacing, 2.2) * uGlowScale;
        vec4 color = vec4(heatRamp(min(heat, 0.92)), clamp(alpha, 0.0, 1.0));
        ${finishColor('color')}
        ${OUTPUT}
      }
    `,
  });
}

export function flameMaterial(
  flame: IUniform<number>,
  scale: GlowScale,
  cut: CutUniforms,
  time: TimeUniform,
): ShaderMaterial {
  return new ShaderMaterial({
    ...blend(),
    side: DoubleSide,
    uniforms: {
      uFlame: flame,
      uGlowScale: scale.uGlowScale,
      uCutHalf: cut.uCoreHalf,
      uCutCentre: cut.uCoreCentre,
      uTime: time.uTime,
      uCore: { value: new Color(THEME.flame) },
      uEdge: { value: new Color(THEME.fire) },
    },
    vertexShader: /* glsl */ `
      attribute float flameShare;
      varying float vShare;
      varying vec3 vNormalView;
      varying vec3 vView;
      ${CUT_VERTEX}
      void main() {
        vShare = flameShare;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 view = viewMatrix * world;
        vView = -view.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uFlame;
      uniform float uGlowScale;
      uniform float uTime;
      uniform vec3 uCore;
      uniform vec3 uEdge;
      varying float vShare;
      varying vec3 vNormalView;
      varying vec3 vView;
      ${CUT_FRAGMENT}
      ${NOISE}
      void main() {
        if (cutAway()) discard;
        float facing = abs(dot(normalize(vNormalView), normalize(vView)));
        float flicker = valueNoise(vec2(vShare * 6.0 - uTime * 7.0, vWorld.y * 20.0 + vWorld.z * 20.0));
        float body = pow(facing, 1.4) * (1.0 - smoothstep(0.35, 1.0, vShare));
        float alpha = clamp(body * uFlame * (0.65 + 0.5 * flicker) * ${glslFloat(EFFECT_LOOK.flameAlpha)} * uGlowScale, 0.0, 1.0);
        vec3 hue = mix(uCore, uEdge, smoothstep(0.1, 0.8, vShare + (1.0 - facing) * 0.4));
        vec4 color = vec4(hue, alpha);
        ${finishColor('color')}
        ${OUTPUT}
      }
    `,
  });
}

export interface PlumeTone {
  readonly hot: boolean;
  readonly alpha: number;
}

export function plumeMaterial(
  strength: IUniform<number>,
  scale: GlowScale,
  time: TimeUniform,
  tone: PlumeTone,
): ShaderMaterial {
  return new ShaderMaterial({
    ...blend(),
    side: DoubleSide,
    uniforms: {
      uStrength: strength,
      uGlowScale: scale.uGlowScale,
      uTime: time.uTime,
      uTint: { value: new Color(tone.hot ? THEME.hotStream : THEME.coldStream) },
      uTail: { value: new Color(THEME.exhaust) },
    },
    vertexShader: /* glsl */ `
      attribute float along;
      varying float vAlong;
      varying float vFacing;
      varying vec3 vLocal;
      void main() {
        vAlong = along;
        vLocal = position;
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        vec3 normalView = normalize(normalMatrix * normal);
        vFacing = abs(dot(normalView, normalize(-view.xyz)));
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uStrength;
      uniform float uGlowScale;
      uniform float uTime;
      uniform vec3 uTint;
      uniform vec3 uTail;
      varying float vAlong;
      varying float vFacing;
      varying vec3 vLocal;
      ${tone.hot ? HEAT_RAMP_GLSL : ''}
      ${NOISE}
      void main() {
        float angle = atan(vLocal.y, vLocal.z);
        float shimmer = valueNoise(vec2(vAlong * 9.0 - uTime * ${glslFloat(EFFECT_LOOK.shimmerSpeed)}, angle * 5.0));
        float streaks = valueNoise(vec2(vAlong * 3.0 - uTime * 2.0, angle * 14.0));
        float fade = pow(1.0 - vAlong, 1.6) * smoothstep(0.0, 0.06, vAlong);
        float alpha = ${glslFloat(tone.alpha)} * uStrength * uGlowScale * fade * pow(vFacing, 1.2) * (0.55 + 0.45 * shimmer) * (0.75 + 0.5 * streaks);
        ${tone.hot ? 'vec3 hue = mix(heatRamp(clamp(uStrength * 0.85, 0.0, 1.0)), uTail, smoothstep(0.15, 0.9, vAlong));' : 'vec3 hue = mix(uTint, uTail, vAlong);'}
        vec4 color = vec4(hue, clamp(alpha, 0.0, 1.0));
        ${finishColor('color')}
        ${OUTPUT}
      }
    `,
  });
}

export function blurMaterial(
  blur: IUniform<number>,
  angle: IUniform<number>,
  blades: number,
): ShaderMaterial {
  return new ShaderMaterial({
    ...blend(),
    side: DoubleSide,
    uniforms: {
      uBlur: blur,
      uAngle: angle,
      uSheen: { value: new Color(EFFECT_LOOK.blurSheen) },
      uShade: { value: new Color(EFFECT_LOOK.blurShade) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vPolar;
      void main() {
        vPolar = vec2(length(position.yz), atan(position.y, position.z));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uBlur;
      uniform float uAngle;
      uniform vec3 uSheen;
      uniform vec3 uShade;
      varying vec2 vPolar;
      void main() {
        float share = clamp((vPolar.x - ${glslFloat(EFFECT_LOOK.blurInner)}) / ${glslFloat(EFFECT_LOOK.blurSpan)}, 0.0, 1.0);
        float lobes = 0.5 + 0.5 * cos(${glslFloat(blades)} * (vPolar.y + uAngle - share * 0.9));
        float edge = smoothstep(0.0, 0.08, share) * (1.0 - smoothstep(0.92, 1.0, share));
        float rings = 0.6 + 0.4 * sin(share * 40.0);
        float alpha = uBlur * edge * (0.55 + 0.5 * lobes) * (0.8 + 0.2 * rings);
        vec4 color = vec4(mix(uShade, uSheen, lobes * share), clamp(alpha, 0.0, 1.0));
        ${finishColor('color')}
        ${OUTPUT}
      }
    `,
  });
}

export interface StreakUniforms {
  readonly uViewport: IUniform<Vector2>;
  readonly uMinPixels: IUniform<number>;
  readonly uGain: IUniform<number>;
  readonly uWidthScale: IUniform<number>;
}

export function createStreakUniforms(): StreakUniforms {
  return {
    uViewport: { value: new Vector2(1, 1) },
    uMinPixels: { value: EFFECT_LOOK.streakMinPixels },
    uGain: { value: LOOK.streakGain },
    uWidthScale: { value: 1 },
  };
}

export function streakMaterial(uniforms: StreakUniforms): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
    uniforms: { ...uniforms },
    vertexShader: /* glsl */ `
      attribute vec2 corner;
      attribute vec3 head;
      attribute vec3 tail;
      attribute vec4 tint;
      attribute float width;
      uniform vec2 uViewport;
      uniform float uMinPixels;
      uniform float uWidthScale;
      varying vec4 vTint;
      varying vec2 vCorner;
      void main() {
        vec4 clipHead = projectionMatrix * modelViewMatrix * vec4(head, 1.0);
        vec4 clipTail = projectionMatrix * modelViewMatrix * vec4(tail, 1.0);
        vec2 screenHead = clipHead.xy / clipHead.w * uViewport;
        vec2 screenTail = clipTail.xy / clipTail.w * uViewport;
        vec2 along = screenHead - screenTail;
        float span = length(along);
        vec2 direction = span > 0.001 ? along / span : vec2(1.0, 0.0);
        vec2 side = vec2(-direction.y, direction.x);
        vec4 clip = mix(clipTail, clipHead, corner.x);
        float pixelsPerUnit = projectionMatrix[1][1] * uViewport.y / max(clip.w, 0.001);
        float pixels = max(uMinPixels, width * uWidthScale * pixelsPerUnit);
        clip.xy += side * corner.y * pixels / uViewport * clip.w;
        clip.xy += direction * (corner.x * 2.0 - 1.0) * pixels * 0.5 / uViewport * clip.w;
        vTint = tint;
        vCorner = corner;
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uGain;
      varying vec4 vTint;
      varying vec2 vCorner;
      void main() {
        float across = 1.0 - abs(vCorner.y);
        float alpha = vTint.a * uGain * smoothstep(0.0, 0.7, across) * smoothstep(0.0, 0.85, vCorner.x);
        float cover = clamp(alpha, 0.0, 1.0);
        gl_FragColor = vec4(vTint.rgb, 1.0);
        ${OUTPUT}
        gl_FragColor = vec4(gl_FragColor.rgb * cover, cover * ${glslFloat(LOOK.streakCover)});
      }
    `,
  });
}
