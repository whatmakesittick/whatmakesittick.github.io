import type { PartContext, Section } from '../context';
import { stubSection } from '../stub';

export function buildStreamlines(context: PartContext): Section {
  return stubSection(context, 'streamlines', ['streamlinesGroup']);
}

export function buildFarmAir(context: PartContext): Section {
  return stubSection(context, 'farmAir', ['prevailingWind', 'windArrows', 'shearProfile']);
}
