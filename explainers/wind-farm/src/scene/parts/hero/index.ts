import type { PartContext, Section } from '../context';
import { stubSection } from '../stub';

export function buildHero(context: PartContext): Section {
  return stubSection(
    context,
    'hero',
    [
      'foundation',
      'tower',
      'transformer',
      'towerCable',
      'nacelle',
      'cooler',
      'hub',
      'blades',
      'pitchCylinders',
      'sweptArea',
      'heroWake',
    ],
    ['hub', 'yawPivot', 'towerBase'],
  );
}
