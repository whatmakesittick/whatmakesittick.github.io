import type { PartContext, Section } from '../context';
import { label, namedGroup, sceneAnchor } from '../context';
import { buildInterior } from './interior';
import { buildTower } from './tower';
import { buildTowerCable } from './towerCable';
import { buildTransformer } from './transformer';

export function buildHero(context: PartContext): Section {
  const root = namedGroup('hero');
  buildTower(context, root);
  buildTransformer(context, root);
  buildTowerCable(context, root);
  const yaw = namedGroup('yaw', root);
  (
    ['nacelle', 'cooler', 'hub', 'blades', 'pitchCylinders', 'sweptArea', 'heroWake'] as const
  ).forEach((part) => label(context, part, yaw, [0, 105, 0]));
  sceneAnchor(context, 'hub', yaw, [-7, 105, 0]);
  sceneAnchor(context, 'yawPivot', yaw, [0, 103.3, 0]);
  yaw.add(buildInterior(context).root);
  return { root, setState: () => undefined };
}
