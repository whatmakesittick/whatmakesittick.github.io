import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  ShaderMaterial,
} from 'three';
import type { Matrix4 } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { WATER_SECTION } from '../../../model/layout';
import { THEME } from '../../../theme';
import { SECTION_LOOK } from '../../constants';
import { mergeParts, registered } from '../context';
import type { PartContext } from '../context';
import { HULL_MASK_GLSL } from './hullPlan';
import { SECTION_GLSL } from './sectionMask';
import { SKY_GLSL, skyUniforms } from './skyShade';
import { WATER, WAVE_GLSL } from './waves';

type Corner = readonly [x: number, z: number];

const VERTEX = /* glsl */ `
${WAVE_GLSL}
attribute vec2 aWall;
varying vec3 vWorld;
varying vec2 vWall;
varying float vDepth;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  float surface = seaHeight(world.xz);
  world.y = mix(world.y, surface, aWall.x);
  vWorld = world.xyz;
  vWall = aWall;
  vDepth = surface - world.y;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAGMENT = /* glsl */ `
${WAVE_GLSL}
${HULL_MASK_GLSL}
${SECTION_GLSL}
${SKY_GLSL}
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uGlint;
uniform vec4 uLook;
uniform float uBack;
varying vec3 vWorld;
varying vec2 vWall;
varying float vDepth;
void main() {
  float fade = sectionFade();
  if (fade <= 0.0 || (uBack > 0.5 && insideHull(vWorld, -0.002))) discard;
  float depth = clamp(vDepth / uLook.x, 0.0, 1.0);
  float edge = smoothstep(0.0, uLook.w, vWall.y);
  vec3 colour = mix(uShallow, uDeep, sqrt(depth));
  float rim = (1.0 - smoothstep(0.0, uLook.z, vDepth)) * edge;
  if (uBack > 0.5) {
    vec3 view = normalize(vWorld - cameraPosition);
    float fresnel = 0.02 + 0.98 * pow(1.0 - abs(view.y), 5.0);
    vec3 far = mix(uDeep, skyColour(reflect(view, vec3(0.0, 1.0, 0.0))), fresnel);
    colour = mix(far, colour, edge * (1.0 - smoothstep(0.45, 1.0, depth)));
    gl_FragColor = vec4(colour, fade);
  } else {
    float alpha = uLook.y * pow(1.0 - depth, 1.6) * edge;
    gl_FragColor = vec4(mix(colour, uGlint, rim), max(alpha, rim * 0.85) * fade);
  }
  #include <colorspace_fragment>
}
`;

function wall(
  from: Corner,
  to: Corner,
  samples: number,
  bottom: number = SECTION_LOOK.depth,
): BufferGeometry {
  const positions: number[] = [];
  const marks: number[] = [];
  const indices: number[] = [];
  for (let step = 0; step <= samples; step += 1) {
    const share = step / samples;
    const x = from[0] + (to[0] - from[0]) * share;
    const z = from[1] + (to[1] - from[1]) * share;
    const edge = Math.min(share, 1 - share) * 2;
    positions.push(x, -bottom, z, x, 0, z);
    marks.push(0, edge, 1, edge);
    if (step < samples)
      indices.push(step * 2, step * 2 + 2, step * 2 + 1, step * 2 + 1, step * 2 + 2, step * 2 + 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aWall', new Float32BufferAttribute(marks, 2));
  geometry.setIndex(indices);
  return geometry;
}

function material(
  context: PartContext,
  uniforms: Record<string, unknown>,
  back: boolean,
): ShaderMaterial {
  const { depth, clear, rim, edge } = SECTION_LOOK;
  return registered(
    context,
    UNDIMMED_GROUP,
    new ShaderMaterial({
      uniforms: {
        ...uniforms,
        ...skyUniforms(),
        uSeaTime: WATER.uSeaTime,
        uSeaDrift: WATER.uSeaDrift,
        uWaves: WATER.uWaves,
        uShallow: { value: new Color(THEME.waterWall) },
        uDeep: { value: new Color(SECTION_LOOK.deep) },
        uGlint: { value: new Color(SECTION_LOOK.glint) },
        uLook: { value: [depth, clear, rim, edge] },
        uBack: { value: back ? 1 : 0 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    }),
  );
}

export class WaterSectionPart {
  readonly object = new Group();

  constructor(context: PartContext, shared: Record<string, unknown>) {
    const [x0, x1] = WATER_SECTION.x;
    const [z0, z1] = WATER_SECTION.z;
    const { along, across } = SECTION_LOOK.samples;
    const glass = mergeParts([
      wall([x0, z0], [x1, z0], along),
      wall([x0, z1], [x0, z0], across),
      wall([x1, z1], [x1, z0], across),
    ]);
    const front = new Mesh(context.tracker.track(glass), material(context, shared, false));
    const back = new Mesh(
      context.tracker.track(
        wall(
          [x0 - SECTION_LOOK.backReach, z1],
          [x1 + SECTION_LOOK.backReach, z1],
          along,
          SECTION_LOOK.backDepth,
        ),
      ),
      material(context, shared, true),
    );
    back.renderOrder = SECTION_LOOK.renderOrder;
    front.renderOrder = SECTION_LOOK.renderOrder + 1;
    [front, back].forEach((mesh) => (mesh.frustumCulled = false));
    this.object.add(back, front);
    this.object.matrixAutoUpdate = false;
    this.object.visible = false;
  }

  place(frame: Matrix4, on: boolean): void {
    this.object.matrix.copy(frame);
    this.object.matrixWorldNeedsUpdate = true;
    this.object.visible = on;
  }
}
