import type { Object3D } from 'three';
import type { AssemblyState, PortId } from '../../../ids';
import { PORT_IDS } from '../../../ids';
import { namedGroup, setFronts } from '../context';
import type { PartContext, Section } from '../context';
import { buildCrankTrain } from './crank';
import { buildCylinder } from './cylinder';
import { buildPlug } from './plug';

const RIM_REST = 0.35;
const RIM_GAIN = 2.2;

export function buildEngine(context: PartContext, parent: Object3D, glowParent: Object3D): Section {
  const root = namedGroup('engine', parent);
  const cylinder = buildCylinder(context, root);
  const train = buildCrankTrain(context, root);
  const plug = buildPlug(context, root, glowParent);
  const fronts = [cylinder.halves.front, ...train.fronts];
  return {
    root,
    setState: (state: AssemblyState) => {
      setFronts(fronts, state.view.cutaway);
      train.setState(state);
      PORT_IDS.forEach((port: PortId) => {
        cylinder.rims[port].emissiveIntensity = RIM_REST + RIM_GAIN * state.crank.ports[port];
      });
      plug.setState(state, state.view.cutaway && state.setting === 'bench');
    },
  };
}
