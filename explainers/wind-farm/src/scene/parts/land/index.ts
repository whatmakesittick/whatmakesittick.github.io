import type { PartContext, Section } from '../context';
import { stubSection } from '../stub';

export function buildTurbineLand(context: PartContext): Section {
  return stubSection(context, 'turbineLand', ['land']);
}

export function buildFarmLand(context: PartContext): Section {
  return stubSection(context, 'farmLand', ['farmLand']);
}
