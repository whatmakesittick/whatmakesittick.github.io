import type { Group } from 'three';
import { RACK_STACK } from '../../../model';
import type { BoxSpec } from '../../../model';
import { label, namedGroup } from '../context';
import { RACK_X, SPAN, SWITCH_BANDS, TRAY_X, TRAY_Z, around, height, middle } from './dims';
import { RACK_FINISHES } from './finishes';
import { bezel, handles, led, proud } from './front';
import { box, lifted, perBand } from './kit';
import type { Kit, Look } from './kit';

const COLUMNS = 16;
const COLUMN_PITCH_M = 0.024;
const CAGE = { x: 0.02, y: 0.012, depth: 0.006 } as const;
const MOUTH = { x: 0.016, y: 0.0085, depth: 0.0005 } as const;
const ROW_SHARES = [0.33, 0.67] as const;
const LIGHT_SHARE = 0.9;
const DARK_EVERY = 7;
const SWITCH_TALL = height(SWITCH_BANDS[0]);
const COLUMN_X = Array.from(
  { length: COLUMNS },
  (_, index) => RACK_X + (index - (COLUMNS - 1) / 2) * COLUMN_PITCH_M,
);

function ports(): { cages: BoxSpec[]; mouths: BoxSpec[] } {
  const cells = ROW_SHARES.flatMap((share) => COLUMN_X.map((x) => [x, share * SWITCH_TALL]));
  return {
    cages: cells.map(([x, y]) => box(around(x, CAGE.x), around(y, CAGE.y), proud(CAGE.depth))),
    mouths: cells.map(([x, y]) =>
      box(around(x, MOUTH.x), around(y, MOUTH.y), proud(MOUTH.depth, CAGE.depth)),
    ),
  };
}

function linkLights(): BoxSpec[] {
  return SWITCH_BANDS.flatMap(([bottom], tray) =>
    COLUMN_X.filter((_, column) => (tray * 5 + column * 3) % DARK_EVERY !== 0).map((x) =>
      lifted(led(x, SWITCH_TALL * LIGHT_SHARE), bottom),
    ),
  );
}

export function buildSwitchTrays(kit: Kit, root: Group): void {
  const group = namedGroup('switchTrays', root);
  const add = (look: Look, local: readonly BoxSpec[]) =>
    kit.boxes(group, 'switchTrays', look, perBand(SWITCH_BANDS, local));
  const { cages, mouths } = ports();
  add('steelDark', [box(TRAY_X, [0, SWITCH_TALL], TRAY_Z)]);
  add(RACK_FINISHES.bezel, [bezel(SWITCH_TALL)]);
  add('steelLight', [...cages, ...handles(SWITCH_TALL)]);
  add(RACK_FINISHES.port, mouths);
  kit.boxes(group, 'switchTrays', 'fibre', linkLights());
  label(kit.context, 'switchTrays', group, [
    SPAN.x[0],
    middle(RACK_STACK.switchTrays),
    middle(TRAY_Z),
  ]);
}
