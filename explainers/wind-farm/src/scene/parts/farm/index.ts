import type { PartContext, Section } from '../context';
import { stubSection } from '../stub';

export function buildFarm(context: PartContext): Section {
  return stubSection(
    context,
    'farm',
    [
      'farmTurbines',
      'accessRoads',
      'spacingMarker',
      'wakePlumes',
      'collectorCables',
      'substation',
      'gridLine',
    ],
    ['farmCentre', 'heroSite', 'substation'],
  );
}
