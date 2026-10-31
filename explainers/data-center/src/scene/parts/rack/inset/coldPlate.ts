import type { Group } from 'three';
import { namedGroup } from '../../context';
import type { PartContext } from '../../context';
import { LAYER, flatMesh } from './flat';
import { INK } from './ink';
import { COLD_PLATE, STROKE } from './layout';
import { arrowHeads, merged, outlines, rects, ribbon } from './strokes';

export const COLD_PLATE_NAME = 'chipInsetColdPlate';

const INLET = -1;
const OUTLET = 1;

function hose(side: number) {
  return merged([
    rects([COLD_PLATE.port(side)]),
    ribbon(COLD_PLATE.hose(side), COLD_PLATE.hoseWidth),
  ]);
}

export function coldPlateDrawing(context: PartContext): Group {
  const group = namedGroup(COLD_PLATE_NAME);
  const flow = arrowHeads(COLD_PLATE.flowTips, STROKE.flowHead);
  group.add(
    flatMesh(context, rects([COLD_PLATE.body]), INK.plate, LAYER.fill),
    flatMesh(context, rects(COLD_PLATE.water), INK.supply, LAYER.inner),
    flatMesh(context, hose(INLET), INK.supply, LAYER.inner),
    flatMesh(context, hose(OUTLET), INK.return, LAYER.inner),
    flatMesh(
      context,
      merged([outlines([COLD_PLATE.body], STROKE.line), flow]),
      INK.line,
      LAYER.line,
    ),
  );
  return group;
}
