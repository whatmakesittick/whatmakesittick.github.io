import type { Object3D } from 'three';
import type { AssemblyState, FarmSite, SpacingD } from '../../../ids';
import {
  HERO_SITE,
  HUB_HEIGHT_M,
  SUBSTATION,
  TURBINE_GEOMETRY,
  terrainHeight,
} from '../../../model';
import { SUBSTATION_HEIGHT_M } from '../../constants';
import { bearingTurn, namedGroup, sceneAnchor } from '../context';
import type { Motion, PartContext, Section } from '../context';
import { CollectorCables } from './cables';
import { Fleet } from './fleet';
import { GridLine } from './gridLine';
import { spacingMarker } from './marker';
import { WakePlumes } from './plumes';
import { accessRoads } from './roads';
import { buildSubstation, YARD_LEVEL } from './substation';

const [HUB_X] = TURBINE_GEOMETRY.hub;
const ORIGIN = [0, 0, 0] as const;

interface LayoutAnchors {
  readonly farmCentre: Object3D;
  readonly heroSite: Object3D;
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function placeAnchors(anchors: LayoutAnchors, sites: readonly FarmSite[]): void {
  const x = average(sites.map((site) => site.x));
  const z = average(sites.map((site) => site.z));
  anchors.farmCentre.position.set(x, terrainHeight(x, z) + HUB_HEIGHT_M, z);
  const hero = sites[HERO_SITE];
  const heroHub = terrainHeight(hero.x, hero.z) + HUB_HEIGHT_M;
  anchors.heroSite.position.set(hero.x + HUB_X, heroHub, hero.z);
}

export function buildFarm(context: PartContext): Section {
  const root = namedGroup('farm');
  const fleet = new Fleet(context);
  const plumes = new WakePlumes(context);
  const roads = accessRoads(context);
  const cables = new CollectorCables(context);
  const marker = spacingMarker(context);
  const grid = new GridLine(context);
  const layers = [roads, cables.layer, marker];
  root.add(fleet.group, plumes.group, grid.group, buildSubstation(context));
  layers.forEach((layer) => root.add(layer.group));
  const anchors: LayoutAnchors = {
    farmCentre: sceneAnchor(context, 'farmCentre', root, ORIGIN),
    heroSite: sceneAnchor(context, 'heroSite', root, ORIGIN),
  };
  const substationMiddle = YARD_LEVEL + SUBSTATION_HEIGHT_M / 2;
  sceneAnchor(context, 'substation', root, [SUBSTATION.x, substationMiddle, SUBSTATION.z]);
  let spacing: SpacingD | undefined;
  let azimuth = 0;
  return {
    root,
    setState: (state: AssemblyState) => {
      const yaw = bearingTurn(state.rotor.yawDeg);
      if (state.farm.spacing !== spacing) {
        spacing = state.farm.spacing;
        layers.forEach((layer) => layer.show(state.farm.spacing));
        fleet.place(state.farm.sites, yaw, azimuth);
        placeAnchors(anchors, state.farm.sites);
      }
      fleet.shadeBy(state.farm.deficits);
      plumes.setState(state, yaw);
      cables.setState(state);
      grid.setState(state);
    },
    animate: (motion: Motion, state: AssemblyState) => {
      azimuth = motion.azimuth;
      layers.forEach((layer) => layer.widen(motion.cameraDistance));
      fleet.animate(motion, bearingTurn(state.rotor.yawDeg));
      const flowing = cables.animate(motion, state);
      const drifting = plumes.animate(motion, state);
      return flowing || drifting;
    },
  };
}
