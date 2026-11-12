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
import { Transport, addRail } from './bay/transport';
import { buildWall, buildWindows } from './bay/wall';
import { Batch } from './fab/batch';

export function* buildBay(context: PartContext): Steps<Section> {
  const root = namedGroup('bay');
  root.add(buildHaze(context));
  const batch = new Batch(context);
  root.add(buildBayFloor(context, batch));
  addRail(batch);
  batch.flush(root);
  yield;
  root.add(buildCeiling(context), buildStrips(context), buildWall(context), buildWindows(context));
  root.add(buildGlows(context));
  yield;
  const tools = toolSpots();
  const rows = new RowSwitch(rowFootprints(tools));
  root.add(buildTools(context, tools, rows), buildLamps(context, lampSpots(tools), rows));
  const transport = new Transport(context);
  root.add(transport.object);
  return {
    root,
    setState: () => undefined,
    animate(frame, state) {
      const switched = rows.follow(frame.cameraPosition);
      const moving = transport.animate(frame, state);
      return switched || moving;
    },
  };
}
