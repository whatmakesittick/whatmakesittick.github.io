import type { PartContext, Section } from '../context';
import { stubSection } from '../stub';
import { buildInterior } from './interior';

export function buildHero(context: PartContext): Section {
  const section = stubSection(
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
  section.root.add(buildInterior(context).root);
  return section;
}
