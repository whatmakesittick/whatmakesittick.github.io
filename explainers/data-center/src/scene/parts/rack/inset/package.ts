import type { Group } from 'three';
import { namedGroup } from '../../context';
import type { PartContext } from '../../context';
import { LAYER, flatMesh } from './flat';
import { INK } from './ink';
import { PACKAGE, STROKE } from './layout';
import { discs, merged, outlines, rects } from './strokes';

export function packageDrawing(context: PartContext): Group {
  const group = namedGroup('chipInsetPackage');
  const boxes = [PACKAGE.board, PACKAGE.substrate, PACKAGE.interposer, ...PACKAGE.dies];
  const lines = merged([
    outlines([...boxes, ...PACKAGE.memory, ...PACKAGE.lidOutlines], STROKE.line),
    rects(PACKAGE.memoryStripes),
  ]);
  const fills = [
    [rects([PACKAGE.board]), INK.board],
    [discs(PACKAGE.balls, PACKAGE.ballRadius), INK.solder],
    [rects([PACKAGE.substrate]), INK.substrate],
    [rects([PACKAGE.interposer]), INK.interposer],
    [rects(PACKAGE.dies), INK.die],
    [rects(PACKAGE.memory), INK.memory],
    [rects(PACKAGE.paste), INK.paste],
    [rects(PACKAGE.lid), INK.lid],
  ] as const;
  group.add(
    ...fills.map(([geometry, ink]) => flatMesh(context, geometry, ink, LAYER.fill)),
    flatMesh(context, lines, INK.line, LAYER.line),
  );
  return group;
}
