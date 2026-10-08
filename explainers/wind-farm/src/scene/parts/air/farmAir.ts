import type { AssemblyState, SpacingD } from '../../../ids';
import { bearingTurn, namedGroup } from '../context';
import type { Motion, PartContext, Section } from '../context';
import { BEARING_STEP_DEG, SHEAR_ARROWS, WIND_ARROWS } from './constants';
import { GroundArrowPart } from './groundArrow';
import { ShearProfilePart } from './shearProfile';
import { WindArrowsPart } from './windArrows';
import { quantise } from './windFrame';

export function farmAirSection(context: PartContext): Section {
  const root = namedGroup('farmAir');
  const ground = new GroundArrowPart(context);
  const arrows = new WindArrowsPart(context);
  const shear = new ShearProfilePart(context);
  root.add(ground.group, arrows.group, shear.group);
  let placed: { spacing: SpacingD; bearing: number } | undefined;

  const place = (spacing: SpacingD, bearing: number) => {
    if (placed?.spacing === spacing && placed.bearing === bearing) return;
    placed = { spacing, bearing };
    const turn = bearingTurn(bearing);
    ground.place(spacing, turn);
    arrows.place(spacing, turn);
    shear.place(spacing, turn);
  };

  return {
    root,
    setState(state: AssemblyState) {
      arrows.group.visible = state.view.streamlines;
      shear.group.visible = state.view.streamlines;
      place(state.farm.spacing, quantise(state.wind.fromDeg, BEARING_STEP_DEG));
    },
    animate(motion: Motion, state: AssemblyState) {
      if (!state.view.streamlines) return false;
      const metres = motion.delta * state.wind.speed;
      arrows.advance(metres * WIND_ARROWS.playback);
      shear.advance(metres * SHEAR_ARROWS.playback);
      return true;
    },
  };
}
