import { Color, Vector3, Vector4 } from 'three';
import { SKY, SUN_DIRECTION } from '../../constants';

export function skyUniforms() {
  const { colours, heights, glow } = SKY;
  return {
    uZenith: { value: new Color(colours.zenith) },
    uUpper: { value: new Color(colours.upper) },
    uSunHorizon: { value: new Color(colours.sunHorizon) },
    uHaze: { value: new Color(colours.haze) },
    uGlow: { value: new Color(colours.glow) },
    uSunDisc: { value: new Color(colours.sun) },
    uSun: { value: new Vector3(...SUN_DIRECTION).normalize() },
    uSkyHeights: { value: new Vector3(heights.band, heights.upper, 0) },
    uSkyGlow: { value: new Vector4(glow.tight, glow.broad, glow.tightGain, glow.broadGain) },
  };
}

export const SKY_GLSL = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uUpper;
uniform vec3 uSunHorizon;
uniform vec3 uHaze;
uniform vec3 uGlow;
uniform vec3 uSunDisc;
uniform vec3 uSun;
uniform vec3 uSkyHeights;
uniform vec4 uSkyGlow;

vec3 skyColour(vec3 direction) {
  float up = max(direction.y, 0.0);
  vec2 flat2 = normalize(direction.xz + vec2(1e-5));
  float sunward = 0.5 + 0.5 * dot(flat2, normalize(uSun.xz));
  vec3 horizon = mix(uHaze, uSunHorizon, pow(sunward, 4.0));
  vec3 sky = mix(horizon, uUpper, smoothstep(0.0, uSkyHeights.y, pow(up, 0.8)));
  sky = mix(sky, uZenith, smoothstep(uSkyHeights.y * 0.6, 1.0, up));
  sky = mix(sky, uHaze, (1.0 - smoothstep(0.0, uSkyHeights.x, up)) * (1.0 - sunward) * 0.6);
  float near = max(dot(direction, uSun), 0.0);
  sky += uGlow * (pow(near, uSkyGlow.x) * uSkyGlow.z + pow(near, uSkyGlow.y) * uSkyGlow.w * exp(-up * 5.0));
  return sky;
}
`;
