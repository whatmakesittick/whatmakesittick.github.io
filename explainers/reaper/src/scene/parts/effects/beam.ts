import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DoubleSide,
  Mesh,
  NormalBlending,
  Quaternion,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import type { BeamLook } from '../../constants';
import { registered } from '../context';
import type { EmphasisGroup, PartContext } from '../context';

const VERTEX = /* glsl */ `
uniform float uLength;
uniform vec2 uRadius;
varying float vAlong;
varying vec3 vNormalView;
varying vec3 vViewPosition;
void main() {
  vAlong = position.y;
  float radius = mix(uRadius.x, uRadius.y, position.y);
  vec3 placed = vec3(position.x * radius, position.y * uLength, position.z * radius);
  vec4 view = modelViewMatrix * vec4(placed, 1.0);
  vViewPosition = -view.xyz;
  vNormalView = normalize(normalMatrix * vec3(position.x, 0.0, position.z));
  gl_Position = projectionMatrix * view;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
uniform float uOffset;
uniform float uLength;
uniform float uCore;
uniform vec4 uDash;
uniform float uDashFloor;
uniform vec2 uFade;
varying float vAlong;
varying vec3 vNormalView;
varying vec3 vViewPosition;
void main() {
  float facing = abs(dot(normalize(vNormalView), normalize(vViewPosition)));
  float body = pow(facing, uCore);
  float distance = vAlong * uLength;
  float along = uDash.w > 0.0 ? log(1.0 + distance / uDash.w) * uDash.w : distance;
  float phase = fract(along / max(uDash.x, 1e-3) - uOffset);
  float dash = uDash.x > 0.0
    ? smoothstep(0.0, 0.12, phase) * (1.0 - smoothstep(uDash.y, uDash.y + 0.12, phase))
    : 1.0;
  float fade = smoothstep(0.0, uFade.x, vAlong) * (1.0 - smoothstep(1.0 - uFade.y, 1.0, vAlong));
  float alpha = uOpacity * body * mix(uDashFloor, 1.0, dash) * fade;
  gl_FragColor = vec4(uColour, alpha);
  #include <colorspace_fragment>
}
`;

const Y_AXIS = new Vector3(0, 1, 0);
const UNIT_RADIUS = 1;

export class Beam {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;
  private readonly look: BeamLook;
  private readonly direction = new Vector3();
  private readonly turn = new Quaternion();

  constructor(context: PartContext, group: EmphasisGroup, look: BeamLook, colour: string) {
    this.look = look;
    const geometry = new CylinderGeometry(UNIT_RADIUS, UNIT_RADIUS, 1, look.segments, 1, true);
    geometry.translate(0, 0.5, 0);
    const { dash } = look;
    this.material = registered(
      context,
      group,
      new ShaderMaterial({
        uniforms: {
          uColour: { value: new Color(colour) },
          uOpacity: { value: look.opacity },
          uOffset: { value: 0 },
          uLength: { value: 1 },
          uCore: { value: look.core },
          uRadius: { value: new Vector2(look.startRadius, look.endRadius) },
          uDash: { value: new Vector4(dash.period, dash.duty, dash.speed, dash.logScale) },
          uDashFloor: { value: dash.floor },
          uFade: { value: new Vector2(...look.fade) },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: look.glow ? AdditiveBlending : NormalBlending,
        side: DoubleSide,
        toneMapped: false,
      }),
    );
    this.mesh = new Mesh(context.tracker.track(geometry), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  span(from: Vector3, to: Vector3, endRadius = this.look.endRadius): void {
    this.direction.subVectors(to, from);
    const length = this.direction.length();
    this.mesh.position.copy(from);
    this.mesh.quaternion.copy(this.turn.setFromUnitVectors(Y_AXIS, this.direction.normalize()));
    this.material.uniforms.uLength.value = length;
    (this.material.uniforms.uRadius.value as Vector2).y = endRadius;
  }

  setColour(colour: string): void {
    (this.material.uniforms.uColour.value as Color).set(colour);
  }

  setOpacity(opacity: number): void {
    this.material.uniforms.uOpacity.value = opacity;
  }

  advance(deltaSeconds: number): void {
    const offset = this.material.uniforms.uOffset.value + deltaSeconds * this.look.dash.speed;
    this.material.uniforms.uOffset.value = offset - Math.floor(offset);
  }
}
