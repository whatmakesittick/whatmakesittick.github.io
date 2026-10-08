import type { BufferGeometry, Group, Object3D } from 'three';
import { finishMesh, label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { FINISHES } from '../../finishes';
import { NACELLE } from './constants';
import { buildCooler } from './cooler';
import { hatchGeometry, railGeometry } from './nacelleRoof';
import { SEAM_FINISH, SHELL_FINISH, shellGeometries } from './nacelleShell';

const LABEL_POINT = [1.0, NACELLE.maxY, -1.0] as const;

export interface Nacelle {
  readonly openable: Group;
  readonly casters: readonly BufferGeometry[];
}

export function buildNacelle(context: PartContext, yaw: Object3D): Nacelle {
  const shell = shellGeometries();
  const nacelle = finishMesh(context, shell.closed, 'nacelle', SHELL_FINISH);
  nacelle.name = 'nacelle';
  const openable = namedGroup('nacelleOpenable', nacelle);
  openable.add(
    finishMesh(context, shell.open, 'nacelle', SHELL_FINISH),
    finishMesh(context, shell.openSeams, 'nacelle', SEAM_FINISH),
    finishMesh(context, railGeometry(1), 'nacelle', FINISHES.steel),
  );
  nacelle.add(
    finishMesh(context, shell.closedSeams, 'nacelle', SEAM_FINISH),
    finishMesh(context, railGeometry(-1), 'nacelle', FINISHES.steel),
    finishMesh(context, hatchGeometry(), 'nacelle', FINISHES.paintShade),
  );
  yaw.add(nacelle);
  label(context, 'nacelle', nacelle, [...LABEL_POINT]);
  const cooler = buildCooler(context, yaw, openable);
  return { openable, casters: [shell.closed, shell.open, cooler] };
}
