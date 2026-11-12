import { BoxGeometry } from 'three';
import type { Object3D } from 'three';
import type { AssemblyState } from '../../../ids';
import { MASK } from '../../../model/layout';
import { shrinkRatio, slitMm } from '../../../model/optics';
import { SCAN_START_UNITS } from '../../../model/run';
import { mm } from '../../../model/scale';
import { THEME } from '../../../theme';
import { mesh } from '../context';
import type { PartContext } from '../context';
import { glowSprite } from '../kit';
import { BAND_GLOW_SIZE, BAND_THICK, MASK_AT } from './dims';

export interface MaskBand {
  setState(state: AssemblyState): void;
  fit(closeUp: number): void;
  warmUp(compile: (object: Object3D) => void): void;
}

export function buildMaskBand(context: PartContext, parent: Object3D): MaskBand {
  const bar = mesh(
    context,
    new BoxGeometry(1, BAND_THICK, MASK.patternM.width),
    'mask',
    'slitGlow',
  );
  bar.position.set(MASK_AT[0], MASK_AT[1] - BAND_THICK / 2, MASK_AT[2]);
  const glow = glowSprite(context, 'mask', THEME.euv, BAND_GLOW_SIZE);
  glow.position.copy(bar.position);
  const parts = [bar, glow];
  parts.forEach((part) => (part.visible = false));
  parent.add(bar, glow);
  return {
    setState(state) {
      const on = state.phase >= SCAN_START_UNITS;
      parts.forEach((part) => (part.visible = on));
      bar.scale.x = mm(slitMm(state.optics).h) * shrinkRatio(state.optics).scan;
    },
    fit(closeUp) {
      glow.scale.setScalar(BAND_GLOW_SIZE * closeUp);
    },
    warmUp(compile) {
      parts.forEach(compile);
    },
  };
}
