import type { AssemblyState } from '../../../ids';
import { namedGroup } from '../context';
import type { Frame, PartContext, Section } from '../context';
import { Exhaust } from './exhaust';
import { HeatFlow } from './heat';
import { JouleBead } from './joule';
import { PacketFlow } from './packets';
import { PowerFlow } from './power';

function flowing({ playing, view }: AssemblyState): boolean {
  return playing && (view.power || view.heat || view.packets);
}

export function buildFlows(context: PartContext): Section {
  const root = namedGroup('flows');
  const bead = new JouleBead(context, root);
  const power = new PowerFlow(context, root);
  const heat = new HeatFlow(context, root);
  const packets = new PacketFlow(context, root);
  const exhaust = new Exhaust(context, root);
  let time = 0;
  return {
    root,
    setState(state: AssemblyState) {
      bead.setState(state.joule);
      power.setState(state);
      heat.setState(state);
      packets.setState(state);
    },
    animate(frame: Frame, state: AssemblyState) {
      const moving = flowing(state) || frame.outage.active;
      if (moving) time += frame.delta;
      bead.scale(frame.cameraDistance);
      power.animate(time, frame.outage);
      heat.animate(time);
      packets.animate(time);
      exhaust.animate(frame.outage);
      return moving;
    },
  };
}
