import type { Material, WebGLProgramParametersWithUniforms } from 'three';

export const NEAR_FADE = { hiddenM: 2.2, shownM: 3.4 } as const;

const VERTEX_HEAD = /* glsl */ `
varying float vCameraGap;
`;

const VERTEX_BODY = /* glsl */ `
{
  vec4 nearWorld = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    nearWorld = instanceMatrix * nearWorld;
  #endif
  nearWorld = modelMatrix * nearWorld;
  vCameraGap = length(nearWorld.xz - cameraPosition.xz);
}
`;

const FRAGMENT_HEAD = /* glsl */ `
varying float vCameraGap;
`;

const FRAGMENT_BODY = /* glsl */ `
{
  float shown = smoothstep(${NEAR_FADE.hiddenM.toFixed(2)}, ${NEAR_FADE.shownM.toFixed(2)}, vCameraGap);
  float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  if (dither >= shown) discard;
}
`;

function inject(source: string, anchor: string, addition: string): string {
  if (!source.includes(anchor)) throw new Error(`Shader anchor missing: ${anchor}`);
  return source.replace(anchor, `${anchor}\n${addition}`);
}

function patch(shader: WebGLProgramParametersWithUniforms): void {
  shader.vertexShader = inject(shader.vertexShader, '#include <common>', VERTEX_HEAD);
  shader.vertexShader = inject(shader.vertexShader, '#include <begin_vertex>', VERTEX_BODY);
  shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', FRAGMENT_HEAD);
  shader.fragmentShader = inject(
    shader.fragmentShader,
    '#include <clipping_planes_fragment>',
    FRAGMENT_BODY,
  );
}

const patched = new WeakSet<Material>();

export function fadeNearCamera<M extends Material>(material: M): M {
  if (patched.has(material)) return material;
  patched.add(material);
  const compile = material.onBeforeCompile.bind(material);
  const cacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    patch(shader);
  };
  material.customProgramCacheKey = () => `${cacheKey()}|nearFade`;
  material.needsUpdate = true;
  return material;
}
