import type { Group } from 'three';
import { namedGroup } from '../../context';
import type { PartContext } from '../../context';
import { LAYER, flatMesh } from './flat';
import { INK } from './ink';
import { HEAT_SINK, STROKE } from './layout';
import { arrowHeads, merged, outlines, rects } from './strokes';

export const HEAT_SINK_NAME = 'chipInsetHeatSink';

export function heatSinkDrawing(context: PartContext): Group {
  const group = namedGroup(HEAT_SINK_NAME);
  const body = [HEAT_SINK.base, ...HEAT_SINK.fins];
  const warm = merged([
    rects(HEAT_SINK.warmShafts),
    arrowHeads(HEAT_SINK.airTips, HEAT_SINK.airHead),
  ]);
  group.add(
    flatMesh(context, rects(HEAT_SINK.coolShafts), INK.coolAir, LAYER.back),
    flatMesh(context, warm, INK.warmAir, LAYER.back),
    flatMesh(context, rects(body), INK.sink, LAYER.fill),
    flatMesh(context, outlines(body, STROKE.line), INK.line, LAYER.line),
  );
  return group;
}
