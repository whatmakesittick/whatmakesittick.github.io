import type { PartContext, Section } from '../context';
import { stubSection } from '../stub';
import { streamlinesSection } from './streamlines';

export function buildStreamlines(context: PartContext): Section {
  return streamlinesSection(context);
}

export function buildFarmAir(context: PartContext): Section {
  return stubSection(context, 'farmAir', ['prevailingWind', 'windArrows', 'shearProfile']);
}
