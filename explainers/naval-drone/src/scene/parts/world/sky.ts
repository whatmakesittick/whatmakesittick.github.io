import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector4 } from 'three';
import type { Camera, Texture } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { SKY } from '../../constants';
import { registered } from '../context';
import type { PartContext } from '../context';
import { SKY_GLSL, skyUniforms } from '../water/skyShade';

const VERTEX = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
${SKY_GLSL}
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform vec4 uClouds;
uniform vec3 uCloudBand;
uniform float uDisc;
uniform sampler2D uFoamMap;
varying vec3 vDirection;

void main() {
  vec3 direction = normalize(vDirection);
  vec3 colour = skyColour(direction);
  float up = max(direction.y, 0.0);
  vec2 plane = direction.xz / (direction.y + 0.1) * uClouds.z;
  vec2 streak = vec2(plane.x * 0.6 + plane.y, (plane.y - plane.x * 0.5) * uClouds.w);
  float cloud = texture2D(uFoamMap, streak).r;
  float cover = smoothstep(uClouds.x, uClouds.x + uClouds.y, cloud);
  cover *= smoothstep(uCloudBand.x, uCloudBand.x + 0.05, up) * (1.0 - smoothstep(uCloudBand.y * 0.5, uCloudBand.y, up));
  float sunward = 0.5 + 0.5 * dot(normalize(direction.xz + vec2(1e-5)), normalize(uSun.xz));
  float near = max(dot(direction, uSun), 0.0);
  vec3 cloudColour = mix(uCloudShade, uCloudLit, clamp(pow(sunward, 2.0) * 1.1 + near * 0.3 - 0.1, 0.0, 1.0));
  colour = mix(colour, cloudColour, cover * uCloudBand.z);
  colour = mix(colour, uSunDisc * 1.6, smoothstep(uDisc, uDisc + (1.0 - uDisc) * 0.35, near));
  colour = mix(uHaze, colour, smoothstep(-0.02, 0.0, direction.y));
  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;

export function createSky(context: PartContext, foamMap: Texture): Mesh {
  const { clouds, colours, glow } = SKY;
  const material = registered(
    context,
    UNDIMMED_GROUP,
    new ShaderMaterial({
      uniforms: {
        ...skyUniforms(),
        uCloudLit: { value: new Color(colours.cloudLit) },
        uCloudShade: { value: new Color(colours.cloudShade) },
        uClouds: {
          value: new Vector4(clouds.cover, clouds.sharpness, clouds.scale, clouds.stretch),
        },
        uCloudBand: { value: [clouds.from, clouds.to, clouds.opacity] },
        uDisc: { value: glow.disc },
        uFoamMap: { value: foamMap },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: BackSide,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const geometry = context.tracker.track(
    new SphereGeometry(SKY.radius, SKY.widthSegments, SKY.heightSegments),
  );
  const dome = new Mesh(geometry, material);
  dome.frustumCulled = false;
  dome.renderOrder = SKY.renderOrder;
  dome.onBeforeRender = (_renderer, _scene, camera: Camera) => {
    dome.position.copy(camera.position);
    dome.parent?.worldToLocal(dome.position);
    dome.updateMatrixWorld();
  };
  return dome;
}
