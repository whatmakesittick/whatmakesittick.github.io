import type { Section } from '../context';
import { label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { LID, LYRE } from '../../../model';
import { buildLegs } from './legs';
import { buildLid, lidPoint } from './lid';
import { buildLyre } from './lyre';
import { buildShell } from './shell';
import { CaseXray } from './xray';

const CASE_LABEL = { reach: 1, z: -1.4, clearance: 0.01 } as const;
const CASE_LABEL_POINT = lidPoint(
  CASE_LABEL.reach,
  CASE_LABEL.z,
  LID.thickness + CASE_LABEL.clearance,
);

export function createCase(context: PartContext): Section {
  const root = namedGroup('case');
  const lyre = buildLyre(context);
  root.add(buildShell(context), buildLid(context), ...buildLegs(context), lyre.root);
  label(context, 'case', root, CASE_LABEL_POINT);
  label(context, 'pedals', lyre.root, [0, LYRE.pedalY, LYRE.z + LYRE.pedalLength]);
  const xray = new CaseXray(context.cut);
  xray.watch(root);
  return {
    root,
    setState: (state) => {
      xray.setState(state);
      lyre.setState(state);
    },
    animate: (frame) => lyre.animate(frame.delta),
  };
}
