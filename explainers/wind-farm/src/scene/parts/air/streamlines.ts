import { Mesh } from 'three';
import type { AssemblyState } from '../../../ids';
import { bearingTurn, label, namedGroup, registeredMaterial } from '../context';
import type { Motion, PartContext, Section } from '../context';
import { STREAMLINES } from './constants';
import { flowMaterial } from './flowMaterial';
import { StreamlineGeometry } from './streamlineGeometry';
import { quantise } from './windFrame';

export function streamlinesSection(context: PartContext): Section {
  const root = namedGroup('streamlinesGroup');
  const lines = new StreamlineGeometry();
  const material = registeredMaterial(context, 'streamlinesGroup', flowMaterial());
  const mesh = new Mesh(context.tracker.track(lines.geometry), material);
  mesh.name = 'streamlines';
  root.add(mesh);
  label(context, 'streamlinesGroup', root, STREAMLINES.labelAt);
  let induction = Number.NaN;
  const clock = material.uniforms.uClock;

  return {
    root,
    setState(state: AssemblyState) {
      root.visible = state.view.streamlines;
      root.rotation.y = bearingTurn(state.wind.fromDeg);
      const target = quantise(state.wind.induction, STREAMLINES.inductionStep);
      if (target === induction) return;
      induction = target;
      lines.shape(induction);
    },
    animate(motion: Motion, state: AssemblyState) {
      if (!state.view.streamlines) return false;
      const step = motion.delta * state.wind.speed * STREAMLINES.playback;
      clock.value = ((clock.value as number) + step) % STREAMLINES.dashPeriod;
      return true;
    },
  };
}
