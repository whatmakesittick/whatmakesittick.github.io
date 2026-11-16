import { Color } from 'three';
import type { IUniform, Material } from 'three';
import { GLASS } from '../constants';

export interface ShaderInsert {
  readonly after: string;
  readonly code: string;
}

export interface ShaderPatch {
  readonly key: string;
  readonly uniforms?: Readonly<Record<string, IUniform>>;
  readonly vertexHead?: string;
  readonly vertex?: readonly ShaderInsert[];
  readonly fragmentHead?: string;
  readonly fragment?: readonly ShaderInsert[];
}

const patched = new WeakSet<Material>();

function insert(source: string, head = '', inserts: readonly ShaderInsert[] = []): string {
  const withHead = head ? source.replace('void main() {', `${head}\nvoid main() {`) : source;
  return inserts.reduce(
    (code, { after, code: added }) => code.replace(after, `${after}\n${added}`),
    withHead,
  );
}

export function patchMaterial(material: Material, patch: ShaderPatch): void {
  if (patched.has(material)) return;
  patched.add(material);
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, patch.uniforms);
    shader.vertexShader = insert(shader.vertexShader, patch.vertexHead, patch.vertex);
    shader.fragmentShader = insert(shader.fragmentShader, patch.fragmentHead, patch.fragment);
  };
  material.customProgramCacheKey = () => patch.key;
  material.needsUpdate = true;
}

export const WORLD_POSITION_VERTEX = {
  head: 'varying vec3 vWorldPos;',
  body: {
    after: '#include <project_vertex>',
    code: 'vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
  },
} as const;

export const OPAQUE_FRAGMENT = '#include <opaque_fragment>';

const GLASS_FRAGMENT = /* glsl */ `
float glassFacing = abs(dot(normalize(normal), normalize(vViewPosition)));
float glassFresnel = pow(1.0 - glassFacing, 3.0);
float glassSide = normalize(normal).x;
float glassStreak = smoothstep(0.08, 0.0, abs(glassSide + 0.58)) + 0.6 * smoothstep(0.05, 0.0, abs(glassSide - 0.74));
gl_FragColor.rgb += uGlassRim * (glassFresnel * uGlassRimStrength + glassStreak * uGlassStreak);
gl_FragColor.a = clamp(gl_FragColor.a + glassFresnel * uGlassFresnel + glassStreak * uGlassStreak, 0.0, 1.0);
`;

export function patchGlass(material: Material): void {
  patchMaterial(material, {
    key: 'iodine-glass',
    uniforms: {
      uGlassRim: { value: new Color(GLASS.rim) },
      uGlassRimStrength: { value: GLASS.rimStrength },
      uGlassFresnel: { value: GLASS.fresnelAlpha },
      uGlassStreak: { value: GLASS.streak },
    },
    fragmentHead:
      'uniform vec3 uGlassRim;\nuniform float uGlassRimStrength;\nuniform float uGlassFresnel;\nuniform float uGlassStreak;',
    fragment: [{ after: OPAQUE_FRAGMENT, code: GLASS_FRAGMENT }],
  });
}
