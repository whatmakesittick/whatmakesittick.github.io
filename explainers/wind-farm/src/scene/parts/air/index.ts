import type { PartContext, Section } from '../context';
import { farmAirSection } from './farmAir';
import { streamlinesSection } from './streamlines';

export function buildStreamlines(context: PartContext): Section {
  return streamlinesSection(context);
}

export function buildFarmAir(context: PartContext): Section {
  return farmAirSection(context);
}
