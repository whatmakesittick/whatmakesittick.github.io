import type { AssemblyState } from '../../../ids';
import { namedGroup } from '../context';
import type { Frame, PartContext, Section } from '../context';
import { buildBuilding } from './building';
import { buildElectricalRoom } from './electricalRoom';
import { buildGenerators } from './generators';
import type { PieceBuilder } from './kit';
import { buildPowerYard } from './powerYard';
import { buildRoofPlant } from './roofPlant';
import { buildSite } from './site';

export { GENSET_STACK_TIPS } from './constants';

const PIECES: readonly PieceBuilder[] = [
  buildSite,
  buildPowerYard,
  buildGenerators,
  buildElectricalRoom,
  buildBuilding,
  buildRoofPlant,
];

export function buildCampus(context: PartContext): Section {
  const root = namedGroup('campus');
  const pieces = PIECES.map((build) => build(context, root));
  return {
    root,
    setState(state: AssemblyState) {
      pieces.forEach((piece) => piece.setState?.(state));
    },
    animate(frame: Frame, state: AssemblyState) {
      return pieces.map((piece) => piece.animate?.(frame, state) ?? false).some(Boolean);
    },
  };
}
