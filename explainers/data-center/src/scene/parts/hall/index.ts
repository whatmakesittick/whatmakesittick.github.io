import type { AssemblyState } from '../../../ids';
import { namedGroup } from '../context';
import type { Frame, PartContext, Section } from '../context';
import { buildCdus } from './cooling';
import { buildNetwork } from './network';
import { buildBusway } from './power';
import { buildRacks } from './racks';

export function buildHall(context: PartContext): Section {
  const root = namedGroup('hall');
  const racks = buildRacks(context, root);
  buildBusway(context, root);
  const cdus = buildCdus(context, root);
  buildNetwork(context, root);
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
