import { Group } from 'three';
import type { BufferGeometry } from 'three';
import { AIRFRAME_SHADE, WING } from '../../constants';
import { FINISHES } from '../../finishes';
import type { LoopPoint } from '../../geometry/airfoilSurface';
import { shadeUnderside } from '../../geometry/shading';
import { finSurface, ventralSurface, wingPanel } from '../../geometry/wing';
import type { Side } from '../../geometry/wing';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';
import type { CutawaySwitch } from './cutaway';

const SIDES: readonly Side[] = [1, -1];

function panels(from: number, to: number, loop: readonly LoopPoint[]): BufferGeometry {
  return shadeUnderside(
    mergeParts(SIDES.map((side) => wingPanel(side, from, to, loop))),
    AIRFRAME_SHADE,
  );
}

export function buildWing(
  context: PartContext,
  cutaway: CutawaySwitch,
  loop: readonly LoopPoint[],
): Group {
  const group = new Group();
  const inner = panels(0, WING.innerSpan, loop);
  const outer = panels(WING.innerSpan, WING.halfSpan, loop);
  group.add(
    cutaway.whole(partMesh(context, inner, 'wing', context.looks.wing)),
    cutaway.opened(partMesh(context, inner.clone(), 'wing', FINISHES.wingGhost)),
    partMesh(context, outer, 'wing', context.looks.wing),
  );
  return group;
}

export function buildTail(context: PartContext, loop: readonly LoopPoint[]): Group {
  const group = new Group();
  const fins = shadeUnderside(
    mergeParts(SIDES.map((side) => finSurface(side, loop))),
    AIRFRAME_SHADE,
  );
  const ventral = shadeUnderside(ventralSurface(loop), AIRFRAME_SHADE);
  group.add(
    partMesh(context, fins, 'vTail', context.looks.tail),
    partMesh(context, ventral, 'ventralFin', context.looks.tail),
  );
  return group;
}
