import { BackSide, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import type { Camera } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { SKY } from '../../constants';
import type { PartContext } from '../context';
import { createSkyPalette, skyPalette } from './skyPalette';

const VERTEX = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uGlow;
uniform vec3 uLimb;
uniform vec3 uSun;
uniform float uDip;
uniform float uHaze;
uniform float uStars;
uniform float uLights;
uniform float uShore;
varying vec3 vDirection;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  vec3 direction = normalize(vDirection);
  float height = direction.y + uDip;
  float azimuth = atan(direction.z, direction.x);
  vec2 flat2 = normalize(direction.xz + vec2(1e-5));
  float sunward = max(dot(flat2, normalize(uSun.xz)), 0.0);
  vec3 sky = mix(uHorizon, uZenith, pow(clamp(height, 0.0, 1.0), 0.42));
  sky += uGlow * exp(-max(height, 0.0) / uHaze) * pow(sunward, 2.5);
  vec3 cell = floor(direction * 1100.0);
  float star = step(0.9986, hash(cell)) * smoothstep(0.0, 0.1, height);
  sky += vec3(0.85, 0.9, 1.0) * star * uStars * (0.35 + 0.65 * hash(cell + 3.1));
  sky += uLimb * exp(-abs(height) * 70.0) * step(0.0, height);
  float depth = clamp(-height, 0.0, 1.0);
  vec3 ground = mix(uGround * 1.9 + uGlow * 0.12 * pow(sunward, 3.0), uGround, pow(depth, 0.3));
  float sector = smoothstep(-0.1, 0.5, sin(azimuth + 2.2));
  float coast = sector * uShore * step(height, -0.004 - 0.004 * (1.0 + sin(azimuth * 9.0)));
  ground = mix(ground, uGround * 0.35, coast * step(-0.03, height));
  float row = step(-0.0095, height) * step(height, -0.0075);
  float spark = step(0.97, hash(vec3(floor(azimuth * 1400.0), 7.0, 1.0)));
  ground += vec3(1.0, 0.72, 0.4) * spark * row * sector * uLights * 0.9;
  ground += uLimb * 0.5 * exp(-depth * 90.0);
  vec3 colour = mix(ground, sky, smoothstep(-0.002, 0.002, height));
  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;

export class SkyDomePart {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;
  private readonly palette = createSkyPalette();

  constructor(context: PartContext) {
    const palette = this.palette;
    this.material = new ShaderMaterial({
      uniforms: {
        uZenith: { value: palette.zenith },
        uHorizon: { value: palette.horizon },
        uGround: { value: palette.ground },
        uGlow: { value: palette.glow },
        uLimb: { value: palette.limb },
        uSun: { value: new Vector3(...SKY.sunDirection).normalize() },
        uDip: { value: 0 },
        uHaze: { value: SKY.haze[0] },
        uStars: { value: 0 },
        uLights: { value: 0 },
        uShore: { value: 0 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: BackSide,
      depthWrite: false,
      toneMapped: false,
    });
    context.materials.register(UNDIMMED_GROUP, context.tracker.track(this.material));
    const geometry = context.tracker.track(
      new SphereGeometry(SKY.radius, SKY.widthSegments, SKY.heightSegments),
    );
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = SKY.renderOrder;
    this.mesh.onBeforeRender = (_renderer, _scene, camera: Camera) => {
      this.mesh.position.copy(camera.position);
      this.mesh.parent?.worldToLocal(this.mesh.position);
      this.mesh.updateMatrixWorld();
    };
  }

  setAltitude(altitudeKm: number): void {
    const palette = skyPalette(altitudeKm, this.palette);
    const uniforms = this.material.uniforms;
    uniforms.uDip.value = palette.dip;
    uniforms.uHaze.value = palette.haze;
    uniforms.uStars.value = palette.stars;
    uniforms.uLights.value = palette.lights;
    uniforms.uShore.value = palette.shore;
  }
}
