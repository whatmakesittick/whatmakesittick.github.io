import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { AssemblyState } from '../../../ids';
import { BOAT, HULL_STATIONS } from '../../../model/layout';
import { GHOST } from '../../constants';
import { applyBoatPose } from '../../pose';
import { registered } from '../context';
import type { PartContext } from '../context';

const VERTEX = /* glsl */ `
varying vec3 vNormalView;
varying vec3 vView;
void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vView = -view.xyz;
  vNormalView = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * view;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform vec3 uShape;
varying vec3 vNormalView;
varying vec3 vView;
void main() {
  float facing = abs(dot(normalize(vNormalView), normalize(vView)));
  float rim = pow(1.0 - facing, uShape.x);
  gl_FragColor = vec4(uColour, uShape.y + rim * uShape.z);
  #include <colorspace_fragment>
}
`;

const Y_AXIS = new Vector3(0, 1, 0);
const BOW: [number, number, number] = [
  BOAT.halfLength,
  HULL_STATIONS[HULL_STATIONS.length - 1].deck,
  0,
];

export class GhostPart {
  readonly object = new Group();
  readonly anchor = new Group();
  private readonly tether: Mesh;
  private readonly from = new Vector3();
  private readonly to = new Vector3();
  private readonly turn = new Quaternion();

  constructor(context: PartContext, outline: BufferGeometry) {
    const material = registered(
      context,
      'videoGhost',
      new ShaderMaterial({
        uniforms: {
          uColour: { value: new Color(GHOST.colour) },
          uShape: { value: [GHOST.rim, GHOST.base, GHOST.edge] },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    );
    const hull = new Mesh(outline, material);
    this.anchor.position.set(0, HULL_STATIONS[3].deck, 0);
    hull.add(this.anchor);
    const line = new CylinderGeometry(GHOST.tether.radius, GHOST.tether.radius, 1, 6, 1, true);
    line.translate(0, 0.5, 0);
    this.tether = new Mesh(
      context.tracker.track(line),
      registered(
        context,
        'videoGhost',
        new MeshBasicMaterial({
          color: GHOST.colour,
          transparent: true,
          opacity: GHOST.tether.opacity,
          depthWrite: false,
          toneMapped: false,
        }),
      ),
    );
    this.object.add(hull, this.tether);
    this.object.visible = false;
  }

  setState(state: AssemblyState, boat: Object3D): void {
    const { ghost } = state.link;
    this.object.visible = ghost !== null;
    if (!ghost) return;
    const hull = this.object.children[0];
    applyBoatPose(hull, ghost, state.planing);
    hull.updateMatrixWorld(true);
    boat.updateMatrixWorld(true);
    this.from.set(...BOW).applyMatrix4(hull.matrixWorld);
    this.to.set(...BOW).applyMatrix4(boat.matrixWorld);
    const direction = this.to.clone().sub(this.from);
    const length = direction.length();
    this.tether.visible = length > GHOST.tether.radius;
    this.tether.position.copy(this.from);
    this.tether.quaternion.copy(this.turn.setFromUnitVectors(Y_AXIS, direction.normalize()));
    this.tether.scale.set(1, Math.max(length, 1e-3), 1);
  }
}
