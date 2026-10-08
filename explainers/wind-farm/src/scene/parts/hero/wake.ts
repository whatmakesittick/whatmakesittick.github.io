import { CylinderGeometry, MeshBasicMaterial } from 'three';
import type { Mesh, Object3D } from 'three';
import { clamp } from '@core/math';
import type { AssemblyState, OperatingStateId } from '../../../ids';
import { ROTOR_DIAMETER_M, ROTOR_RADIUS_M, WAKE_DECAY } from '../../../model/constants';
import { FINISHES } from '../../finishes';
import { label, namedGroup, registeredMaterial, registeredMesh } from '../context';
import type { PartContext } from '../context';
import { HUB } from './constants';
import { wakeShader } from './wakeShader';
import type { WakeUniforms } from './wakeShader';

const SEGMENTS = { around: 72, along: 20 } as const;
const MAX_OPACITY = 0.2;
const OPACITY_STEP = 0.05;
const FLOW_PER_RPM = 0.012;
const LABEL_SHARE = 0.3;
const LABEL_REACH_M = ROTOR_DIAMETER_M;
const CALM_STATES: readonly OperatingStateId[] = ['parked', 'idle'];
const PROGRAM_KEY = 'heroWake';

export interface HeroWake {
  setState(state: AssemblyState): void;
  animate(delta: number, rpm: number): void;
}

function unitFrustum(): CylinderGeometry {
  const geometry = new CylinderGeometry(1, 1, 1, SEGMENTS.around, SEGMENTS.along, true);
  geometry.translate(0, 0.5, 0);
  geometry.rotateZ(-Math.PI / 2);
  return geometry;
}

function quantised(strength: number): number {
  const opacity = clamp(strength, 0, 1) * MAX_OPACITY;
  return Math.round(opacity / OPACITY_STEP) * OPACITY_STEP;
}

export function buildHeroWake(context: PartContext, yaw: Object3D): HeroWake {
  const group = namedGroup('heroWake', yaw);
  const uniforms: WakeUniforms = { wakeLength: { value: 1 }, wakeFlow: { value: 0 } };
  const compile = wakeShader(uniforms);
  const materials = new Map<number, MeshBasicMaterial>();
  const materialFor = (opacity: number): MeshBasicMaterial => {
    const cached = materials.get(opacity);
    if (cached) return cached;
    const material = new MeshBasicMaterial({ ...FINISHES.wake, opacity });
    material.onBeforeCompile = compile;
    material.customProgramCacheKey = () => PROGRAM_KEY;
    materials.set(opacity, material);
    return registeredMaterial(context, 'heroWake', material);
  };
  const mesh: Mesh = registeredMesh(context, unitFrustum(), 'heroWake', materialFor(MAX_OPACITY));
  mesh.frustumCulled = false;
  mesh.name = 'heroWake';
  group.add(mesh);
  label(context, 'heroWake', group, [...HUB]);
  const anchor = context.labels.get('heroWake');

  return {
    setState(state) {
      const opacity = quantised(state.farm.plumeStrength);
      const length = state.farm.plumeLengthD * ROTOR_DIAMETER_M;
      group.visible =
        state.view.wakes && !CALM_STATES.includes(state.rotor.state) && opacity > 0 && length > 0;
      if (!group.visible) return;
      mesh.material = materialFor(opacity);
      uniforms.wakeLength.value = length;
      const along = Math.min(length * LABEL_SHARE, LABEL_REACH_M);
      anchor?.position.set(HUB[0] + along, HUB[1] + ROTOR_RADIUS_M + WAKE_DECAY * along, HUB[2]);
    },
    animate(delta, rpm) {
      uniforms.wakeFlow.value += delta * rpm * FLOW_PER_RPM;
    },
  };
}
