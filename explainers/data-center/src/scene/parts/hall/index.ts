import type { AssemblyState } from '../../../ids';
import { namedGroup } from '../context';
import type { Frame, PartContext, Section } from '../context';
import { buildCeiling, ceilingGrid } from './ceiling';
import { buildCdus, coolingLines } from './cooling';
import { buildNetwork, networkLines } from './network';
import { buildBusway, buswayLines } from './power';
import { buildRacks } from './racks';

export function buildHall(context: PartContext): Section {
  const root = namedGroup('hall');
  const racks = buildRacks(context, root);
  const lines = networkLines();
  const grid = ceilingGrid([...lines.fixed, ...buswayLines(), ...coolingLines()], lines.lamps);
  buildBusway(context, root, grid);
  const cdus = buildCdus(context, root, grid);
  buildNetwork(context, root, grid);
  buildCeiling(context, root, grid);
  return {
    root,
    setState(state: AssemblyState) {
      racks.setCooling(state.cooling);
      cdus.visible = state.cooling === 'liquid';
    },
    animate(frame: Frame) {
      return racks.step(frame.delta, frame.cameraDistance);
    },
  };
}
