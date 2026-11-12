import { BoxGeometry, PointLight } from 'three';
import type { Object3D } from 'three';
import type { AssemblyState } from '../../../ids';
import { SCAN_START_UNITS } from '../../../model/run';
import { fieldMm, slitMm } from '../../../model/optics';
import { mm } from '../../../model/scale';
import { THEME } from '../../../theme';
import { mesh } from '../context';
import type { PartContext } from '../context';
import { glowSprite } from '../kit';
import {
  GLOW_SIZE,
  LIGHT_INTENSITY,
  LIGHT_LIFT,
  LIGHT_RANGE,
  SLIT_BASE_X,
  SLIT_LIFT,
  SLIT_TALL,
  WAFER_AT,
} from './dims';

export interface Slit {
  setState(state: AssemblyState): void;
  warmUp(compile: (object: Object3D) => void): void;
}

export function buildSlit(context: PartContext, parent: Object3D): Slit {
  const bar = mesh(
    context,
    new BoxGeometry(SLIT_BASE_X, SLIT_TALL, mm(fieldMm('na033').w)),
    'wafer',
    'slitGlow',
  );
  bar.position.set(WAFER_AT[0], WAFER_AT[1] + SLIT_LIFT, WAFER_AT[2]);
  const glow = glowSprite(context, 'wafer', THEME.euv, GLOW_SIZE);
  glow.position.copy(bar.position);
  const light = new PointLight(THEME.euv, 0, LIGHT_RANGE);
  light.position.set(WAFER_AT[0], WAFER_AT[1] + LIGHT_LIFT, WAFER_AT[2]);
  const parts = [bar, glow];
  parts.forEach((part) => (part.visible = false));
  parent.add(bar, glow, light);
  return {
    setState(state) {
      const on = state.phase >= SCAN_START_UNITS;
      parts.forEach((part) => (part.visible = on));
      light.intensity = on ? LIGHT_INTENSITY : 0;
      bar.scale.x = mm(slitMm(state.optics).h) / SLIT_BASE_X;
    },
    warmUp(compile) {
      parts.forEach(compile);
    },
  };
}
