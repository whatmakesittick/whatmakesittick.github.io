import type { AssemblyState } from '../../../ids';
import { namedGroup } from '../context';
import type { Frame, OutageSample, PartContext, Section } from '../context';
import { RESTING_OUTAGE } from '../outage';
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
  let outage: OutageSample = RESTING_OUTAGE;
  const place = () => {
    power.animate(time, outage);
    heat.animate(time);
    packets.animate(time);
    exhaust.animate(outage);
  };
  return {
    root,
    setState(state: AssemblyState) {
      bead.setState(state.joule);
      power.setState(state);
      heat.setState(state);
      packets.setState(state);
      place();
    },
    animate(frame: Frame, state: AssemblyState) {
      const moving = flowing(state) || frame.outage.active;
      if (moving) time += frame.delta;
      outage = frame.outage;
      bead.scale(frame.cameraDistance);
      place();
      return moving;
    },
  };
}
