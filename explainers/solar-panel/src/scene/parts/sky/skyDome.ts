import { BackSide, Color, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import type { Camera, Mesh } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { SKY_RADIUS_CM } from '../../../model';
import { RENDER_ORDER, SKY_DOME } from '../../constants';
import { registeredMesh } from '../context';
import type { PartContext } from '../context';
import type { SkyPalette } from './palette';

const VERTEX = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 zenith;
uniform vec3 horizon;
uniform vec3 ground;
uniform vec3 glow;
uniform vec3 sunDirection;
uniform float strength;
uniform float horizonBlend;
varying vec3 vDirection;
void main() {
  vec3 direction = normalize(vDirection);
  float height = direction.y;
  vec3 sky = mix(horizon, zenith, pow(clamp(height, 0.0, 1.0), 0.5));
  sky = mix(sky, ground, smoothstep(0.0, -horizonBlend, height));
  float facing = max(dot(direction, sunDirection), 0.0);
  float halo = pow(facing, 12.0) * 0.55 + pow(facing, 160.0) * 0.9;
  float band = exp(-abs(height) * 7.0) * pow(facing * 0.5 + 0.5, 4.0);
  sky += glow * strength * (halo + band * 0.7);
  gl_FragColor = vec4(sky, 1.0);
  #include <colorspace_fragment>
}
`;

export class SkyDomePart {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;

  constructor(context: PartContext) {
    this.material = new ShaderMaterial({
      uniforms: {
        zenith: { value: new Color() },
        horizon: { value: new Color() },
        ground: { value: new Color() },
        glow: { value: new Color() },
        sunDirection: { value: new Vector3(0, 1, 0) },
        strength: { value: 0 },
        horizonBlend: { value: SKY_DOME.horizonBlend },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: BackSide,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });
    const geometry = new SphereGeometry(
      SKY_RADIUS_CM,
      SKY_DOME.widthSegments,
      SKY_DOME.heightSegments,
    );
    this.mesh = registeredMesh(context, geometry, UNDIMMED_GROUP, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = RENDER_ORDER.sky;
    this.mesh.onBeforeRender = (_renderer, _scene, camera: Camera) => {
      this.mesh.position.copy(camera.position);
      this.mesh.updateMatrixWorld();
    };
  }

  setSky(palette: SkyPalette, sunDirection: Vector3): void {
    const uniforms = this.material.uniforms;
    (uniforms.zenith.value as Color).copy(palette.zenith);
    (uniforms.horizon.value as Color).copy(palette.horizon);
    (uniforms.ground.value as Color).copy(palette.ground);
    (uniforms.glow.value as Color).copy(palette.glow);
    (uniforms.sunDirection.value as Vector3).copy(sunDirection);
    uniforms.strength.value = palette.strength;
  }
}
