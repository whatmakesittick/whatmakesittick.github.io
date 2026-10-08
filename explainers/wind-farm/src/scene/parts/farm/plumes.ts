import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import type {
  DataTexture,
  Group,
  MeshStandardMaterial,
  Object3D,
  WebGLProgramParametersWithUniforms,
} from 'three';
import { anchorAt } from '@core/scene/parts';
import { createMaterial } from '@core/scene/materials';
import type { AssemblyState, FarmSite, OperatingStateId } from '../../../ids';
import {
  HERO_SITE,
  HUB_HEIGHT_M,
  PLUME_VISIBLE_DEFICIT,
  ROTOR_DIAMETER_M,
  TURBINE_COUNT,
  TURBINE_GEOMETRY,
} from '../../../model';
import { FINISHES } from '../../finishes';
import { namedGroup, registeredMaterial } from '../context';
import type { Motion, PartContext } from '../context';
import { PLUME } from './constants';
import { sitePosition } from './fleet';
import { plumeGeometry } from './plumeGeometry';
import { streakTexture } from './textures';

const PART = 'wakePlumes';
const CACHE_KEY = 'farmWakePlume';
const STILL_STATES: ReadonlySet<OperatingStateId> = new Set(['parked', 'idle']);
const LABEL_REACH_M = 3 * ROTOR_DIAMETER_M;
const Y_AXIS = new Vector3(0, 1, 0);
const UNIT = new Vector3(1, 1, 1);
const HUB = new Vector3(...TURBINE_GEOMETRY.hub);
const PLUME_FINISH = {
  ...FINISHES.wake,
  vertexColors: true,
  emissive: FINISHES.wake.color,
  emissiveIntensity: PLUME.glow,
};
const VERTEX_DECLARATIONS = 'varying float vPlumeHeight;\nvoid main() {';
const VERTEX_HEIGHT = `#include <begin_vertex>\nvPlumeHeight = position.y + ${HUB_HEIGHT_M.toFixed(1)};`;
const FRAGMENT_FADE = `#include <normal_fragment_maps>
diffuseColor.a *= pow(abs(dot(normal, normalize(vViewPosition))), ${PLUME.rimPower.toFixed(2)})
  * smoothstep(0.0, ${PLUME.groundFade.toFixed(1)}, vPlumeHeight);`;

function fadePlume(shader: WebGLProgramParametersWithUniforms): void {
  shader.vertexShader = shader.vertexShader
    .replace('void main() {', VERTEX_DECLARATIONS)
    .replace('#include <begin_vertex>', VERTEX_HEIGHT);
  shader.fragmentShader = shader.fragmentShader
    .replace('void main() {', VERTEX_DECLARATIONS)
    .replace('#include <normal_fragment_maps>', FRAGMENT_FADE);
}

function plumeOpacity(strength: number): number {
  const opacity = Math.min(PLUME.maxOpacity, strength * PLUME.opacityPerDeficit);
  return Math.max(PLUME.opacityStep, Math.round(opacity / PLUME.opacityStep) * PLUME.opacityStep);
}

function plumeLength(lengthD: number): number {
  const steps = Math.max(1, Math.round(lengthD / PLUME.lengthStepD));
  return steps * PLUME.lengthStepD * ROTOR_DIAMETER_M;
}

export function plumesShown(state: AssemblyState): boolean {
  const { view, rotor, farm } = state;
  return (
    view.wakes &&
    !STILL_STATES.has(rotor.state) &&
    farm.plumeStrength >= PLUME_VISIBLE_DEFICIT &&
    farm.plumeLengthD > 0
  );
}

export class WakePlumes {
  readonly group: Group;
  private readonly mesh: InstancedMesh;
  private readonly streaks: DataTexture;
  private readonly label: Object3D;
  private readonly materials = new Map<number, MeshStandardMaterial>();
  private readonly matrix = new Matrix4();
  private readonly offset = new Matrix4().makeTranslation(HUB);
  private readonly heading = new Quaternion();
  private readonly position = new Vector3();
  private length = 0;
  private sites?: readonly FarmSite[];
  private yaw?: number;
  private readonly context: PartContext;

  constructor(context: PartContext) {
    this.context = context;
    this.group = namedGroup(PART);
    this.streaks = context.tracker.track(streakTexture());
    this.length = plumeLength(1);
    this.mesh = context.tracker.track(
      new InstancedMesh(
        plumeGeometry(this.length),
        this.materialFor(PLUME.opacityStep),
        TURBINE_COUNT,
      ),
    );
    context.tracker.track({ dispose: () => this.mesh.geometry.dispose() });
    this.mesh.name = PART;
    this.group.add(this.mesh);
    this.label = anchorAt(this.group, 0, 0, 0);
    context.labels.set(PART, this.label);
  }

  setState(state: AssemblyState, yaw: number): void {
    this.group.visible = plumesShown(state);
    this.place(state.farm.sites, yaw);
    if (!this.group.visible) return;
    this.mesh.material = this.materialFor(plumeOpacity(state.farm.plumeStrength));
    this.stretch(plumeLength(state.farm.plumeLengthD));
  }

  animate(motion: Motion, state: AssemblyState): boolean {
    if (!this.group.visible) return false;
    const drift = state.wind.speed * PLUME.streakTimeScale * motion.delta;
    this.streaks.offset.x = (this.streaks.offset.x - drift / PLUME.streakPeriod) % 1;
    return true;
  }

  private place(sites: readonly FarmSite[], yaw: number): void {
    if (sites === this.sites && yaw === this.yaw) return;
    this.sites = sites;
    this.yaw = yaw;
    this.heading.setFromAxisAngle(Y_AXIS, yaw);
    sites.forEach((site, index) => {
      this.matrix.compose(sitePosition(site, this.position), this.heading, UNIT);
      this.mesh.setMatrixAt(index, this.matrix.multiply(this.offset));
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.computeBoundingSphere();
    const hero = sitePosition(sites[HERO_SITE], this.position);
    this.label.position.set(hero.x + LABEL_REACH_M, hero.y + HUB_HEIGHT_M, hero.z);
  }

  private stretch(length: number): void {
    if (length === this.length) return;
    this.length = length;
    const previous = this.mesh.geometry;
    this.mesh.geometry = plumeGeometry(length);
    previous.dispose();
    this.mesh.computeBoundingSphere();
  }

  private materialFor(opacity: number): MeshStandardMaterial {
    const key = Math.round(opacity / PLUME.opacityStep);
    let material = this.materials.get(key);
    if (!material) {
      material = createMaterial({
        ...PLUME_FINISH,
        opacity,
        alphaMap: this.streaks,
        emissiveMap: this.streaks,
      });
      material.onBeforeCompile = fadePlume;
      material.customProgramCacheKey = () => CACHE_KEY;
      registeredMaterial(this.context, PART, material);
      this.materials.set(key, material);
    }
    return material;
  }
}
