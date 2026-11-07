import type { Section } from '../context';
import { label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { CASE, LYRE } from '../../../model';
import { buildLegs } from './legs';
import { buildLid } from './lid';
import { buildLyre } from './lyre';
import { buildShell } from './shell';

export function createCase(context: PartContext): Section {
  const root = namedGroup('case');
  const lyre = buildLyre(context);
  root.add(buildShell(context), buildLid(context), ...buildLegs(context), lyre.root);
  label(context, 'case', root, [CASE.rightX, CASE.rimTop, CASE.frontZ + CASE.bentsideStartZ / 2]);
  label(context, 'pedals', lyre.root, [0, LYRE.pedalY, LYRE.z + LYRE.pedalLength]);
  return {
    root,
    setState: (state) => lyre.setState(state),
    animate: (frame) => lyre.animate(frame.delta),
  };
}
