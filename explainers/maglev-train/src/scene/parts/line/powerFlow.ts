import { Color } from 'three';
import type { Group, IUniform } from 'three';
import type { PowerFlowId } from '../../../ids';
import { THEME } from '../../../theme';
import { label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { POWER_FLOW } from './effectConstants';
import { ribbonMesh } from './ribbon';

const glslFloat = (value: number) => value.toFixed(4);
const LABEL_X = POWER_FLOW.trainEnd + POWER_FLOW.spacing * 12;

const FLOW_DIRECTION: Readonly<Record<PowerFlowId, number>> = {
  none: 0,
  drive: 1,
  regen: -1,
  battery: 0,
};

const CHEVRON_FRAGMENT = /* glsl */ `
uniform vec3 uDrive;
uniform vec3 uRegen;
uniform float uDirection;
uniform float uTravel;

float band(float f, float width, float fw) {
  return smoothstep(0.0, fw, f) * (1.0 - smoothstep(width - fw, width, f));
}

void main() {
  float pointing = -sign(vX) * uDirection;
  float along = pointing * vX;
  float c = (along + abs(vAcross) * ${glslFloat(POWER_FLOW.slant)} - uTravel) / ${glslFloat(POWER_FLOW.spacing)};
  float fw = fwidth(c);
  float f = fract(c);
  float stroke = band(f, ${glslFloat(POWER_FLOW.stroke)}, fw);
  float rim = band(fract(c + ${glslFloat(POWER_FLOW.outline / 2)}), ${glslFloat(POWER_FLOW.stroke + POWER_FLOW.outline)}, fw);
  float edge = 1.0 - smoothstep(0.78, 1.0, abs(vAcross));
  float clearOfTrain = smoothstep(${glslFloat(POWER_FLOW.trainEnd)}, ${glslFloat(POWER_FLOW.trainEnd + POWER_FLOW.trainFade)}, abs(vX));
  float inWindow = smoothstep(${glslFloat(POWER_FLOW.window[0])}, ${glslFloat(POWER_FLOW.window[0] + POWER_FLOW.windowFade)}, vX)
    * (1.0 - smoothstep(${glslFloat(POWER_FLOW.window[1] - POWER_FLOW.windowFade)}, ${glslFloat(POWER_FLOW.window[1])}, vX));
  vec3 tone = uDirection > 0.0 ? uDrive : uRegen;
  vec3 colour = mix(tone * 0.25, tone, stroke) * uTint;
  float alpha = max(stroke, rim * 0.55) * edge * clearOfTrain * inWindow * fogFade() * uOpacity;
  gl_FragColor = vec4(colour, alpha);
  #include <colorspace_fragment>
}
`;

export interface PowerFlow {
  readonly group: Group;
  setFlow(flow: PowerFlowId): void;
  stream(deltaSeconds: number): boolean;
}

export function buildPowerFlow(context: PartContext): PowerFlow {
  const group = namedGroup('powerFlow');
  const direction: IUniform<number> = { value: 0 };
  const travel: IUniform<number> = { value: 0 };
  const mesh = ribbonMesh(context, {
    group: 'powerFlow',
    lane: POWER_FLOW,
    span: POWER_FLOW.window,
    opacity: 1,
    fragment: CHEVRON_FRAGMENT,
    uniforms: {
      uDrive: { value: new Color(THEME.drive) },
      uRegen: { value: new Color(THEME.regen) },
      uDirection: direction,
      uTravel: travel,
    },
  });
  mesh.name = 'powerFlow';
  group.add(mesh);
  label(context, 'powerFlow', group, [LABEL_X, POWER_FLOW.y, POWER_FLOW.z]);
  return {
    group,
    setFlow(flow) {
      direction.value = FLOW_DIRECTION[flow];
      group.visible = direction.value !== 0;
    },
    stream(deltaSeconds) {
      if (!group.visible) return false;
      travel.value = (travel.value + deltaSeconds * POWER_FLOW.speed) % POWER_FLOW.spacing;
      return true;
    },
  };
}
