import type { AssemblyState, Point } from '../../../ids';
import { bearingTurn, label, namedGroup, sceneAnchor } from '../context';
import type { Motion, PartContext, Section } from '../context';
import { HUB, TOWER } from './constants';
import { buildInterior } from './interior';
import { buildNacelle } from './nacelle';
import { buildRotor, turnRotor } from './rotor';
import { buildShadow } from './shadow';
import type { ShadowCaster } from './shadow';
import { buildSpinner } from './spinner';
import { buildSweptArea } from './sweptArea';
import { buildTower } from './tower';
import { buildTowerCable } from './towerCable';
import { buildTransformer } from './transformer';
import { buildHeroWake } from './wake';

const PITCH_LABEL: Point = [HUB[0] - 0.3, HUB[1] + 0.4, 0.9];

export function buildHero(context: PartContext): Section {
  const root = namedGroup('hero');
  const tower = buildTower(context, root);
  buildTransformer(context, root);
  buildTowerCable(context, root);
  const yaw = namedGroup('yaw', root);
  const nacelle = buildNacelle(context, yaw);
  const spinner = buildSpinner(context, yaw);
  const rotor = buildRotor(context, yaw);
  buildSweptArea(context, yaw);
  const wake = buildHeroWake(context, yaw);
  const interior = buildInterior(context);
  const nacelleInterior = namedGroup('nacelleInterior', yaw);
  nacelleInterior.add(interior.root);
  label(context, 'pitchCylinders', nacelleInterior, PITCH_LABEL);
  sceneAnchor(context, 'hub', yaw, HUB);
  sceneAnchor(context, 'yawPivot', yaw, [0, TOWER.topY, 0]);
  const casters: ShadowCaster[] = [
    { geometry: tower.shell, source: tower.mesh },
    ...[...nacelle.casters, ...spinner.casters].map((geometry) => ({ geometry, source: yaw })),
    ...rotor.pitchGroups.map((source) => ({ geometry: rotor.blade, source })),
  ];
  const shadow = buildShadow(context, root, casters);

  return {
    root,
    setState(state: AssemblyState) {
      yaw.rotation.y = bearingTurn(state.rotor.yawDeg);
      yaw.updateMatrix();
      const open = state.view.cutaway;
      nacelle.openable.visible = !open;
      nacelleInterior.visible = open;
      spinner.openable.visible = !open;
      rotor.pitchCylinders.forEach((cylinder) => (cylinder.visible = open));
      wake.setState(state);
      interior.setState(state);
      shadow.update();
    },
    animate(motion: Motion) {
      turnRotor(rotor, motion.azimuth, motion.pitchDeg);
      wake.animate(motion.delta, motion.rpm);
      interior.animate(motion);
      shadow.update();
      return false;
    },
  };
}
