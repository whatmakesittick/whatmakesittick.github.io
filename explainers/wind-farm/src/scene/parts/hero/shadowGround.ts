import { DataTexture, DataUtils, HalfFloatType, LinearFilter, RedFormat, Vector2 } from 'three';
import type { WebGLProgramParametersWithUniforms } from 'three';
import { turbineLandHeight } from '../land/turbineGround';

const GROUND = { originX: -120, originZ: -300, span: 420, texels: 96 } as const;
const PROGRAM_KEY = 'heroShadowGround';

const VERTEX_HEAD = `
uniform sampler2D groundHeights;
uniform vec2 groundOrigin;
uniform float groundSpan;
`;

const VERTEX_PROJECT = `
vec4 shadowWorld = modelMatrix * vec4(transformed, 1.0);
vec2 groundUv = (shadowWorld.xz - groundOrigin) / groundSpan;
shadowWorld.y += texture2D(groundHeights, groundUv).r;
vec4 mvPosition = viewMatrix * shadowWorld;
gl_Position = projectionMatrix * mvPosition;
`;

export function groundHeightTexture(): DataTexture {
  const { originX, originZ, span, texels } = GROUND;
  const data = new Uint16Array(texels * texels);
  for (let row = 0; row < texels; row += 1) {
    for (let column = 0; column < texels; column += 1) {
      const x = originX + ((column + 0.5) / texels) * span;
      const z = originZ + ((row + 0.5) / texels) * span;
      data[row * texels + column] = DataUtils.toHalfFloat(turbineLandHeight(x, z));
    }
  }
  const texture = new DataTexture(data, texels, texels, RedFormat, HalfFloatType);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export function followGround(texture: DataTexture) {
  const uniforms = {
    groundHeights: { value: texture },
    groundOrigin: { value: new Vector2(GROUND.originX, GROUND.originZ) },
    groundSpan: { value: GROUND.span },
  };
  return {
    key: () => PROGRAM_KEY,
    compile(shader: WebGLProgramParametersWithUniforms): void {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = (VERTEX_HEAD + shader.vertexShader).replace(
        '#include <project_vertex>',
        VERTEX_PROJECT,
      );
    },
  };
}
