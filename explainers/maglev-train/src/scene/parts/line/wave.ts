import type { Group, MeshStandardMaterial, Object3D } from 'three';
import { clamp } from '@core/math';
import type { Extent } from '@core/scene/regions';
import type { AssemblyState } from '../../../ids';
import { TRAIN } from '../../../model';
import { LINE_DRAW } from '../../constants';
import { namedGroup, registeredMaterial } from '../context';
import type { Frame, PartContext } from '../context';
import { anchorAt } from '@core/scene/parts';
import { BAND_DRIFT_MS, POWERED_STRIP, STATOR_SHADING, WAVE_HALO } from './effectConstants';
import { poweredStripMesh, waveHaloMesh } from './effects';
import { clipped, poweredStrip } from './slots';
import { createStatorMaterial } from './statorMaterial';
import type { StatorUniforms } from './statorMaterial';
import { createWaveUniforms, driftBands, setSection } from './waveUniforms';

const DRAWN: Extent = [-LINE_DRAW.behind, LINE_DRAW.ahead];
const NOWHERE: Extent = [LINE_DRAW.ahead * 2, LINE_DRAW.ahead * 2];
const LABEL_LEAD = TRAIN.noseX + 18;

export interface WaveEffects {
  readonly powered: Group;
  readonly travelling: Group;
  readonly stator: MeshStandardMaterial;
  setState(state: AssemblyState): void;
  animate(frame: Frame, state: AssemblyState): boolean;
}

function detailFor(cameraDistance: number): number {
  const { detailNear, detailFar } = STATOR_SHADING;
  return 1 - clamp((cameraDistance - detailNear) / (detailFar - detailNear), 0, 1);
}

function isLit(state: AssemblyState): boolean {
  return state.view.wave && state.wave.on;
}

function followStrip(anchors: readonly Object3D[], [from, to]: Extent): void {
  const x = clamp(LABEL_LEAD, from, Math.max(from, to));
  anchors.forEach((anchor) => (anchor.position.x = x));
}

export function buildWaveEffects(context: PartContext): WaveEffects {
  const uniforms: StatorUniforms = { ...createWaveUniforms(), uDetail: { value: 1 } };
  const stator = registeredMaterial(context, 'statorPacks', createStatorMaterial(uniforms));
  const powered = namedGroup('poweredSection');
  const travelling = namedGroup('travellingWave');
  powered.add(poweredStripMesh(context, uniforms));
  travelling.add(waveHaloMesh(context, uniforms));
  const poweredAnchor = anchorAt(powered, LABEL_LEAD, POWERED_STRIP.y, -POWERED_STRIP.z);
  const waveAnchor = anchorAt(travelling, LABEL_LEAD, WAVE_HALO.y, WAVE_HALO.z);
  context.labels.set('poweredSection', poweredAnchor);
  context.labels.set('travellingWave', waveAnchor);
  return {
    powered,
    travelling,
    stator,
    setState(state) {
      const lit = isLit(state);
      const strip = clipped(poweredStrip(state.wave, state.motion.distance), DRAWN);
      powered.visible = lit && strip !== null;
      travelling.visible = powered.visible;
      uniforms.uWaveOn.value = powered.visible ? 1 : 0;
      setSection(uniforms, strip ?? NOWHERE);
      if (strip) followStrip([poweredAnchor, waveAnchor], strip);
    },
    animate(frame, state) {
      uniforms.uDetail.value = detailFor(frame.cameraDistance);
      if (!travelling.visible || !state.playing) return false;
      const sign = state.wave.reversed ? -1 : 1;
      driftBands(uniforms, sign * BAND_DRIFT_MS * frame.delta);
      return true;
    },
  };
}
