import type { Object3D } from 'three';
import type { AssemblyState } from '../../../ids';
import { namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import { buildBench } from './bench';
import { buildMixingBeaker } from './mixingBeaker';
import { buildPourBeaker } from './pourBeaker';
import { buildStirrer } from './stirrer';
import { buildStopwatch } from './stopwatch';
import { buildStream } from './stream';
import { buildThermometer } from './thermometer';

export function buildBeakerWorld(context: PartContext, parent: Object3D): Section {
  const root = namedGroup('beakerWorld', parent);
  buildBench(context, root);
  const pour = buildPourBeaker(context, root);
  const sections: readonly Section[] = [
    buildStirrer(context, root),
    buildMixingBeaker(context, root),
    pour,
    buildStream(context, root, pour.pose),
    buildThermometer(context, root),
    buildStopwatch(context, root),
  ];
  return {
    root,
    setState: (state: AssemblyState) => sections.forEach((section) => section.setState(state)),
    refresh: () => sections.forEach((section) => section.refresh?.()),
  };
}
