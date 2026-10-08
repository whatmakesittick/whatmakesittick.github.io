import type { AssemblyState, Point } from '../../../ids';
import { bearingTurn, label, namedGroup, sceneAnchor } from '../context';
import type { Motion, PartContext, Section } from '../context';
import { HUB, TOWER } from './constants';
import { buildInterior } from './interior';
import { buildNacelle } from './nacelle';
import { buildRotor, turnRotor } from './rotor';
import { buildSpinner } from './spinner';
import { buildTower } from './tower';
import { buildTowerCable } from './towerCable';
import { buildTransformer } from './transformer';

const PITCH_LABEL: Point = [HUB[0] - 0.3, HUB[1] + 0.4, 0.9];

export function buildHero(context: PartContext): Section {
  const root = namedGroup('hero');
  buildTower(context, root);
  buildTransformer(context, root);
  buildTowerCable(context, root);
  const yaw = namedGroup('yaw', root);
  const nacelle = buildNacelle(context, yaw);
  const interior = buildInterior(context);
  const nacelleInterior = namedGroup('nacelleInterior', yaw);
  nacelleInterior.add(interior.root);
  label(context, 'pitchCylinders', nacelleInterior, PITCH_LABEL);
  const spinner = buildSpinner(context, yaw);
  const rotor = buildRotor(context, yaw);
  (['sweptArea', 'heroWake'] as const).forEach((part) => label(context, part, yaw, HUB));
  sceneAnchor(context, 'hub', yaw, HUB);
  sceneAnchor(context, 'yawPivot', yaw, [0, TOWER.topY, 0]);

  return {
    root,
    setState(state: AssemblyState) {
      yaw.rotation.y = bearingTurn(state.rotor.yawDeg);
      const open = state.view.cutaway;
      nacelle.openable.visible = !open;
      nacelleInterior.visible = open;
      spinner.openable.visible = !open;
      rotor.pitchCylinders.forEach((cylinder) => (cylinder.visible = open));
      interior.setState(state);
    },
    animate(motion: Motion) {
      turnRotor(rotor, motion.azimuth, motion.pitchDeg);
      interior.animate(motion);
      return false;
    },
  };
}
