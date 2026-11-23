import { Color, Matrix4 } from 'three';
import type { Material, WebGLProgramParametersWithUniforms } from 'three';
import { SKIN_FLUSH } from '../finishes';
import { SOLE_BACK_M, SOLE_TIP_M, collarHeight } from '../shoes/design';

export const RUNNER_EXTRA = 'runnerExtra';
export const RUNNER_CLOTH = 'runnerCloth';

export const SHOE_COVER = {
  samples: 32,
  substeps: 8,
  marginM: 0.005,
  lateralM: 0.072,
  medialM: 0.06,
} as const;

export const SHOE_FRAMES: readonly [Matrix4, Matrix4] = [new Matrix4(), new Matrix4()];

const FLUSH = new Color(...SKIN_FLUSH);
const SIDE_X = 'vGarmentExtents.w';
const STEP_M = (SOLE_TIP_M - SOLE_BACK_M) / (SHOE_COVER.samples - 1);

function glsl(value: number): string {
  return value.toFixed(5);
}

export function coverCurve(): number[] {
  return Array.from({ length: SHOE_COVER.samples }, (_, at) => {
    const from = SOLE_BACK_M + STEP_M * Math.max(at - 1, 0);
    const to = SOLE_BACK_M + STEP_M * Math.min(at + 1, SHOE_COVER.samples - 1);
    const heights = Array.from({ length: SHOE_COVER.substeps + 1 }, (_, k) =>
      collarHeight(from + ((to - from) * k) / SHOE_COVER.substeps),
    );
    return Math.min(...heights) - SHOE_COVER.marginM;
  });
}

const VERTEX_HEAD = /* glsl */ `
attribute vec4 ${RUNNER_EXTRA};
attribute vec3 ${RUNNER_CLOTH};
varying vec4 vRunnerExtra;
varying vec3 vRunnerCloth;
varying vec3 vBodyWorld;
`;

const VERTEX_BODY = /* glsl */ `
transformed += objectNormal * ${RUNNER_CLOTH}.x;
vRunnerExtra = ${RUNNER_EXTRA};
vRunnerCloth = ${RUNNER_CLOTH};
vBodyWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

function fragmentHead(): string {
  const curve = coverCurve().map(glsl).join(', ');
  const count = SHOE_COVER.samples;
  return /* glsl */ `
uniform vec3 uSkinFlush;
uniform mat4 uShoeFrames[2];
varying vec4 vRunnerExtra;
varying vec3 vRunnerCloth;
varying vec3 vBodyWorld;
const float SHOE_COLLAR[${count}] = float[${count}](${curve});

bool insideShoe(mat4 frame) {
  vec3 p = (frame * vec4(vBodyWorld, 1.0)).xyz;
  if (p.x < ${glsl(SOLE_BACK_M)} || p.x > ${glsl(SOLE_TIP_M)}) return false;
  if (p.z < ${glsl(-SHOE_COVER.medialM)} || p.z > ${glsl(SHOE_COVER.lateralM)}) return false;
  float t = clamp((p.x - ${glsl(SOLE_BACK_M)}) / ${glsl(STEP_M)}, 0.0, ${glsl(count - 1.001)});
  int i = int(floor(t));
  return p.y < mix(SHOE_COLLAR[i], SHOE_COLLAR[i + 1], t - float(i));
}
`;
}

const FRAGMENT_COVER = /* glsl */ `
if (insideShoe(${SIDE_X} < 0.0 ? uShoeFrames[0] : uShoeFrames[1])) discard;
`;

const FRAGMENT_TONE = /* glsl */ `
diffuseColor.rgb *= mix(vec3(1.0), uSkinFlush, vRunnerExtra.x);
`;

function inject(source: string, anchor: string, addition: string): string {
  if (!source.includes(anchor)) throw new Error(`Shader anchor missing: ${anchor}`);
  return source.replace(anchor, `${anchor}\n${addition}`);
}

function patch(shader: WebGLProgramParametersWithUniforms): void {
  shader.uniforms.uSkinFlush = { value: FLUSH };
  shader.uniforms.uShoeFrames = { value: SHOE_FRAMES };
  shader.vertexShader = inject(shader.vertexShader, '#include <common>', VERTEX_HEAD);
  shader.vertexShader = inject(shader.vertexShader, '#include <begin_vertex>', VERTEX_BODY);
  shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', fragmentHead());
  shader.fragmentShader = inject(
    shader.fragmentShader,
    '#include <clipping_planes_fragment>',
    FRAGMENT_COVER,
  );
  shader.fragmentShader = inject(shader.fragmentShader, '#include <color_fragment>', FRAGMENT_TONE);
}

const patched = new WeakSet<Material>();

export function applySkin<M extends Material>(material: M): M {
  if (patched.has(material)) return material;
  patched.add(material);
  const compile = material.onBeforeCompile.bind(material);
  const cacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    patch(shader);
  };
  material.customProgramCacheKey = () => `${cacheKey()}|runnerSkin`;
  material.needsUpdate = true;
  return material;
}
