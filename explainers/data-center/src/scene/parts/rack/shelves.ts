import type { Group } from 'three';
import { RACK_STACK } from '../../../model';
import { label, namedGroup } from '../context';
import { SHELF_BANDS, SPAN, TRAY_X, TRAY_Z, height, middle } from './dims';
import { RACK_FINISHES } from './finishes';
import { across, bezel, handles, led, proud } from './front';
import { box, perBand } from './kit';
import type { Kit } from './kit';

const PSUS = 6;
const PSU_GAP_M = 0.004;
const PSU_REACH_M = 0.004;
const GRILLE_DEPTH_M = 0.0005;
const SHELF_TALL = height(SHELF_BANDS[0]);
const MODULES = across(PSUS, PSU_GAP_M);

function modules() {
  const faces = MODULES.map((x) => box(x, [PSU_GAP_M, SHELF_TALL - PSU_GAP_M], proud(PSU_REACH_M)));
  const grilles = MODULES.map(([from, to]) =>
    box(
      [from + (to - from) * 0.15, to - (to - from) * 0.15],
      [SHELF_TALL * 0.16, SHELF_TALL * 0.6],
      proud(GRILLE_DEPTH_M, PSU_REACH_M),
    ),
  );
  const lights = MODULES.map(([from, to]) =>
    led(to - (to - from) * 0.2, SHELF_TALL * 0.82, PSU_REACH_M),
  );
  const pulls = MODULES.map(([from, to]) =>
    box(
      [from + (to - from) * 0.2, to - (to - from) * 0.4],
      [SHELF_TALL * 0.76, SHELF_TALL * 0.88],
      proud(0.008, PSU_REACH_M),
    ),
  );
  return { faces, grilles, lights, pulls };
}

export function buildPowerShelves(kit: Kit, root: Group): void {
  const group = namedGroup('powerShelves', root);
  const { faces, grilles, lights, pulls } = modules();
  const add = (look: Parameters<Kit['boxes']>[2], local: ReturnType<typeof box>[]) =>
    kit.boxes(group, 'powerShelves', look, perBand(SHELF_BANDS, local));
  add(RACK_FINISHES.chassis, [box(TRAY_X, [0, SHELF_TALL], TRAY_Z)]);
  add(RACK_FINISHES.bezel, [bezel(SHELF_TALL)]);
  add('steelDark', faces);
  kit.faces(group, 'powerShelves', RACK_FINISHES.port, perBand(SHELF_BANDS, grilles));
  kit.faces(group, 'powerShelves', 'statusLight', perBand(SHELF_BANDS, lights));
  add('steelLight', [...pulls, ...handles(SHELF_TALL)]);
  label(kit.context, 'powerShelves', group, [
    SPAN.x[0],
    middle(RACK_STACK.upperShelves),
    middle(TRAY_Z),
  ]);
}
