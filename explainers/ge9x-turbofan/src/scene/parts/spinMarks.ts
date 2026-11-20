import type { Material } from 'three';
import { addPatch, glslFloat, inject } from './shaderChunks';

export type SpinMarkStyle = 'helix' | 'index';

const HELIX = { starts: 3, pitch: 2.2, width: 0.3, lift: 0.75 } as const;
const INDEX = { marks: 6, width: 0.07, shade: 0.45, keyWidth: 0.16, keyLift: 0.9 } as const;
const TURN = 6.2831853;

const HEAD = /* glsl */ `
varying vec3 vSpin;
float spinBand(float value, float width) {
  float aa = fwidth(value) * 1.5 + 0.002;
  return smoothstep(0.0, aa, value) * (1.0 - smoothstep(width - aa, width, value));
}
`;

const HELIX_BODY = /* glsl */ `
float spinTurn = atan(vSpin.z, vSpin.y) / ${glslFloat(TURN)};
float spinStripe = fract(spinTurn * ${glslFloat(HELIX.starts)} + vSpin.x * ${glslFloat(HELIX.pitch)});
diffuseColor.rgb = mix(diffuseColor.rgb, min(vec3(1.0), diffuseColor.rgb * 1.6 + 0.12), spinBand(spinStripe, ${glslFloat(HELIX.width)}) * ${glslFloat(HELIX.lift)});
`;

const INDEX_BODY = /* glsl */ `
float spinTurn = atan(vSpin.z, vSpin.y) / ${glslFloat(TURN)};
float spinSector = fract(spinTurn * ${glslFloat(INDEX.marks)});
diffuseColor.rgb *= 1.0 - spinBand(spinSector, ${glslFloat(INDEX.width)}) * ${glslFloat(INDEX.shade)};
float spinKey = spinBand(fract(spinTurn + ${glslFloat(INDEX.keyWidth / 2)}), ${glslFloat(INDEX.keyWidth)});
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.93, 0.88), spinKey * ${glslFloat(INDEX.keyLift)});
`;

export function applySpinMarks<M extends Material>(material: M, style: SpinMarkStyle): M {
  return addPatch(material, `ge9x-spin-${style}`, (shader) => {
    shader.vertexShader = inject(shader.vertexShader, '#include <common>', 'varying vec3 vSpin;');
    shader.vertexShader = inject(
      shader.vertexShader,
      '#include <begin_vertex>',
      'vSpin = position;',
    );
    shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', HEAD);
    shader.fragmentShader = inject(
      shader.fragmentShader,
      '#include <color_fragment>',
      style === 'helix' ? HELIX_BODY : INDEX_BODY,
    );
  });
}
