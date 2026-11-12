import type { Steps } from '@core/scene/pacing';
import { namedGroup } from './context';
import type { PartContext, Section } from './context';
import { buildCeiling, buildStrips } from './bay/ceiling';
import { buildBayFloor } from './bay/floor';
import { buildGlows } from './bay/glows';
import { buildHaze } from './bay/haze';
import { buildLamps, lampSpots } from './bay/lamps';
import { RowSwitch } from './bay/rows';
import { buildTools, rowFootprints, toolSpots } from './bay/tools';
import { buildWall } from './bay/wall';
import { Batch } from './fab/batch';

export function* buildBay(context: PartContext): Steps<Section> {
  const root = namedGroup('bay');
  root.add(buildHaze(context));
  const batch = new Batch(context);
  root.add(buildBayFloor(context, batch));
  batch.flush(root);
  yield;
  root.add(buildCeiling(context), buildStrips(context), buildWall(context), buildGlows(context));
  yield;
  const tools = toolSpots();
  const rows = new RowSwitch(rowFootprints(tools));
  root.add(buildTools(context, tools, rows), buildLamps(context, lampSpots(tools), rows));
  return {
    root,
    setState: () => undefined,
    animate(frame) {
      return rows.follow(frame.cameraPosition);
    },
  };
}
