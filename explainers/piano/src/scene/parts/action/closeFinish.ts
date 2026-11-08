import { Color, LineSegments, Mesh, MeshStandardMaterial } from 'three';
import type { IUniform, Material, Object3D } from 'three';
import type { MaterialFinish, MaterialLibrary } from '@core/scene/materials';
import { FINISHES } from '../../finishes';
import { finishOf } from '../context';
import { inject } from '../shaderChunks';
import { ACTION_FINISHES } from './finishes';

interface CloseTone {
  readonly finish: MaterialFinish;
  readonly group?: string;
  readonly color?: string;
  readonly roughness?: number;
}

interface ToneUniforms {
  readonly tint: IUniform<Color>;
  readonly roughness: IUniform<number>;
}

const KEEP_ROUGHNESS = -1;

const TONES: readonly CloseTone[] = [
  { finish: ACTION_FINISHES.wippen, color: '#cfa36c' },
  { finish: ACTION_FINISHES.jack, color: '#b07a45' },
  { finish: ACTION_FINISHES.repetition, color: '#e0bf8c' },
  { finish: ACTION_FINISHES.shank, color: '#e6c897' },
  { finish: ACTION_FINISHES.moulding, color: '#8e5636' },
  { finish: FINISHES.keyWood, color: '#e6cd9e' },
  { finish: FINISHES.felt, color: '#f3ead6', roughness: 0.6 },
  { finish: FINISHES.brass, color: '#f0c768', roughness: 0.18 },
  { finish: ACTION_FINISHES.buckskin, group: 'knuckle', color: '#4f3324', roughness: 0.72 },
  { finish: FINISHES.cloth, group: 'wippen', color: '#2f7a48' },
];

const FRAGMENT_HEAD = /* glsl */ `
uniform float uCloseFinish;
uniform vec3 uCloseTint;
uniform float uCloseRoughness;
`;

const ROUGHNESS_BODY = /* glsl */ `
roughnessFactor = mix(roughnessFactor, uCloseRoughness, uCloseFinish * step(0.0, uCloseRoughness));
`;

const FACE_BODY = /* glsl */ `
vec3 faceNormal = inverseTransformDirection(normal, viewMatrix);
vec3 faceUp = max(faceNormal, 0.0);
vec3 faceDown = max(-faceNormal, 0.0);
float faceShade = dot(faceUp * faceUp, vec3(0.6, 1.0, 0.5)) + dot(faceDown * faceDown, vec3(0.8, 0.45, 0.6));
diffuseColor.rgb *= mix(vec3(1.0), uCloseTint * faceShade, uCloseFinish);
`;

function isDrawn(object: Object3D): object is Mesh | LineSegments {
  return object instanceof Mesh || object instanceof LineSegments;
}

function ratio(target: Color, base: Color): Color {
  return new Color(target.r / base.r, target.g / base.g, target.b / base.b);
}

export class CloseFinish {
  private readonly amount: IUniform<number>;
  private readonly materials: MaterialLibrary;
  private readonly patched = new WeakSet<Material>();

  constructor(amount: IUniform<number>, materials: MaterialLibrary) {
    this.amount = amount;
    this.materials = materials;
  }

  cover(root: Object3D): void {
    root.traverse((node) => {
      if (!isDrawn(node) || !(node.material instanceof MeshStandardMaterial)) return;
      this.patch(node.material);
    });
  }

  private toneOf(material: MeshStandardMaterial): ToneUniforms {
    const group = this.materials.groupOf(material);
    const finish = finishOf(material);
    const tone = TONES.find(
      (entry) => entry.finish === finish && (!entry.group || entry.group === group),
    );
    const base = new Color(tone?.finish.color ?? material.color);
    const tint = tone?.color ? ratio(new Color(tone.color), base) : new Color(1, 1, 1);
    return { tint: { value: tint }, roughness: { value: tone?.roughness ?? KEEP_ROUGHNESS } };
  }

  private patch(material: MeshStandardMaterial): void {
    if (this.patched.has(material)) return;
    this.patched.add(material);
    const tone = this.toneOf(material);
    const compile = material.onBeforeCompile.bind(material);
    const cacheKey = material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      compile(shader, renderer);
      shader.uniforms.uCloseFinish = this.amount;
      shader.uniforms.uCloseTint = tone.tint;
      shader.uniforms.uCloseRoughness = tone.roughness;
      shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', FRAGMENT_HEAD);
      shader.fragmentShader = inject(
        shader.fragmentShader,
        '#include <roughnessmap_fragment>',
        ROUGHNESS_BODY,
      );
      shader.fragmentShader = inject(
        shader.fragmentShader,
        '#include <normal_fragment_maps>',
        FACE_BODY,
      );
    };
    material.customProgramCacheKey = () => `${cacheKey()}|close-finish`;
    material.needsUpdate = true;
  }
}
