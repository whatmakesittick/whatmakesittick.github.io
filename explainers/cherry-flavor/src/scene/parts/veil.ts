import { BufferAttribute, BufferGeometry, Color, Mesh, ShaderMaterial } from 'three';
import type { Object3D } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { THEME } from '../../theme';
import { registeredMaterial } from './context';
import type { PartContext } from './context';

const VEIL_VERTEX = /* glsl */ `
varying vec2 vScreen;
void main() {
  vScreen = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const VEIL_FRAGMENT = /* glsl */ `
uniform float uAmount;
uniform vec3 uColour;
uniform vec3 uGlow;
varying vec2 vScreen;
void main() {
  float radius = length(vScreen);
  float ring = smoothstep(0.0, 0.35, uAmount) * (1.0 - smoothstep(0.2, 1.4, radius));
  vec3 colour = mix(uColour, uGlow, ring * 0.25);
  gl_FragColor = vec4(colour, uAmount);
  #include <colorspace_fragment>
}
`;

const FULL_SCREEN = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]);
const XYZ = 3;
const ON_TOP = 999;

export class Veil {
  private readonly mesh: Mesh;
  private readonly shader: ShaderMaterial;

  constructor(context: PartContext, parent: Object3D) {
    this.shader = registeredMaterial(
      context,
      UNDIMMED_GROUP,
      new ShaderMaterial({
        vertexShader: VEIL_VERTEX,
        fragmentShader: VEIL_FRAGMENT,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uAmount: { value: 0 },
          uColour: { value: new Color(THEME.sceneBackground) },
          uGlow: { value: new Color(THEME.cherry) },
        },
      }),
    );
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(FULL_SCREEN, XYZ));
    this.mesh = new Mesh(context.tracker.track(geometry), this.shader);
    this.mesh.name = 'scaleVeil';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = ON_TOP;
    this.mesh.visible = false;
    parent.add(this.mesh);
  }

  show(amount: number): void {
    this.mesh.visible = amount > 0;
    this.shader.uniforms.uAmount.value = amount;
  }
}
