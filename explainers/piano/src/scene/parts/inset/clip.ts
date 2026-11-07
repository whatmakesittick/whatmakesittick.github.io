import type { IUniform, Material, MeshStandardMaterial, Vector4 } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import type { PartContext } from '../context';
import { createCut } from '../cut';
import { inject } from '../shaderChunks';

export type InsetClip = IUniform<Vector4>;

const INSET_GROUP = 'inset';
const VARYING = 'varying vec2 vInsetPlane;';
const VERTEX_BODY = 'vInsetPlane = (modelMatrix * vec4(transformed, 1.0)).yz;';
const FRAGMENT_HEAD = `uniform vec4 uInsetClip;\n${VARYING}`;
const FRAGMENT_BODY =
  'if (any(lessThan(vInsetPlane, uInsetClip.xz)) || any(greaterThan(vInsetPlane, uInsetClip.yw))) discard;';

const clipped = new WeakSet<Material>();

export function clipMaterial<M extends Material>(material: M, clip: InsetClip): M {
  if (clipped.has(material)) return material;
  clipped.add(material);
  const compile = material.onBeforeCompile.bind(material);
  const cacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    shader.uniforms.uInsetClip = clip;
    shader.vertexShader = inject(shader.vertexShader, '#include <common>', VARYING);
    shader.vertexShader = inject(shader.vertexShader, '#include <project_vertex>', VERTEX_BODY);
    shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', FRAGMENT_HEAD);
    shader.fragmentShader = inject(
      shader.fragmentShader,
      '#include <clipping_planes_fragment>',
      FRAGMENT_BODY,
    );
  };
  material.customProgramCacheKey = () => `${cacheKey()}|inset-clip`;
  material.needsUpdate = true;
  return material;
}

class ClippedLibrary extends MaterialLibrary {
  private readonly source: MaterialLibrary;
  private readonly clip: InsetClip;

  constructor(source: MaterialLibrary, clip: InsetClip) {
    super();
    this.source = source;
    this.clip = clip;
  }

  override get(_group: string, finish: MaterialFinish): MeshStandardMaterial {
    return clipMaterial(this.source.get(INSET_GROUP, finish), this.clip);
  }
}

export function insetContext(context: PartContext, clip: InsetClip): PartContext {
  return {
    ...context,
    materials: new ClippedLibrary(context.materials, clip),
    labels: new Map(),
    anchors: {},
    cut: createCut(),
  };
}
