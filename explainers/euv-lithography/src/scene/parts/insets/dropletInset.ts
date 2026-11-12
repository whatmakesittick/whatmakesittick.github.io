import { Color, CylinderGeometry, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';
import type { Object3D, Sprite } from 'three';
import { clamp, lerp, smoothstep } from '@core/math';
import type { AssemblyState } from '../../../ids';
import { DROPLET_UM, FLATTENED_UM } from '../../../model/constants';
import { PART_POINTS } from '../../../model/layout';
import { dropletDrawnM } from '../../../model/scale';
import { THEME } from '../../../theme';
import { FINISHES } from '../../finishes';
import { finishMesh, label, namedGroup, registeredMaterial, sceneAnchor } from '../context';
import type { PartContext } from '../context';
import { glowSprite } from '../kit';
import {
  DISC_THICKNESS_M,
  DROPLET_OFFSET,
  DROPLET_PANEL,
  DROPLET_SEGMENTS,
  FLASH_END_UNITS,
  FLATTEN_END_UNITS,
  FLATTEN_START_UNITS,
  GLOW_SIZE_M,
  HAIR_MARGIN_M,
  HAIR_SIDES,
  HAIR_X,
  LEADER_END_STREAM,
  VIOLET_EMISSIVE,
} from './dims';
import { INSET_FINISHES } from './finishes';
import { addLeader, addPanel } from './panel';
import { HAIR_UM } from '../../../model/constants';
import { MAIN_PULSE_UNITS } from '../light/dims';

const GROUP = 'dropletInset';
const TIN = new Color(THEME.tin);
const VIOLET = new Color(THEME.plasma);
const DROPLET_M = dropletDrawnM(DROPLET_UM);
const DISC_M = dropletDrawnM(FLATTENED_UM);
const HAIR_M = dropletDrawnM(HAIR_UM);
const HALF = 0.5;

export class DropletInset {
  readonly object: Object3D = namedGroup(GROUP);
  private readonly droplet: Mesh;
  private readonly material: MeshStandardMaterial;
  private readonly glow: Sprite;

  constructor(context: PartContext) {
    const { centre, height } = DROPLET_PANEL;
    addPanel(context, GROUP, this.object, DROPLET_PANEL);
    const bottom: [number, number, number] = [centre[0], centre[1] - height * HALF, centre[2]];
    addLeader(context, GROUP, this.object, bottom, LEADER_END_STREAM);
    this.material = registeredMaterial(
      context,
      GROUP,
      new MeshStandardMaterial({
        ...FINISHES.tin,
        transparent: true,
        emissive: VIOLET,
        emissiveIntensity: 0,
      }),
    );
    this.droplet = new Mesh(
      context.tracker.track(new SphereGeometry(HALF, ...DROPLET_SEGMENTS)),
      this.material,
    );
    this.droplet.position.set(centre[0] + DROPLET_OFFSET[0], centre[1], centre[2]);
    this.glow = glowSprite(context, GROUP, THEME.plasma, GLOW_SIZE_M);
    this.glow.position.copy(this.droplet.position);
    const hairLength = height - HAIR_MARGIN_M * 2;
    const hair = finishMesh(
      context,
      new CylinderGeometry(HAIR_M * HALF, HAIR_M * HALF, hairLength, HAIR_SIDES),
      'hair',
      INSET_FINISHES.hair,
    );
    hair.position.set(HAIR_X, centre[1], centre[2]);
    this.object.add(this.droplet, this.glow, hair);
    const top: [number, number, number] = [centre[0], centre[1] + height * HALF, centre[2]];
    label(context, 'dropletInset', this.object, top);
    label(context, 'hair', this.object, [
      PART_POINTS.hair[0],
      PART_POINTS.hair[1],
      PART_POINTS.hair[2] + HAIR_M * HALF,
    ]);
    sceneAnchor(context, 'dropletInset', this.object, centre);
  }

  setState(state: AssemblyState): void {
    this.object.visible = state.view.inset && state.inset === 'droplet';
    const units = state.flash.units;
    const flatten = clamp(
      (units - FLATTEN_START_UNITS) / (FLATTEN_END_UNITS - FLATTEN_START_UNITS),
      0,
      1,
    );
    const burst = clamp((units - MAIN_PULSE_UNITS) / (FLASH_END_UNITS - MAIN_PULSE_UNITS), 0, 1);
    const spread = lerp(DROPLET_M, DISC_M, flatten);
    this.droplet.scale.set(spread, lerp(DROPLET_M, DISC_THICKNESS_M, flatten), spread);
    this.material.color.copy(TIN).lerp(VIOLET, smoothstep(burst, 0, 0.4));
    this.material.emissiveIntensity = VIOLET_EMISSIVE * smoothstep(burst, 0, 0.4);
    this.material.opacity = 1 - smoothstep(burst, 0.5, 1);
    const glow = smoothstep(burst, 0, 0.35) * (1 - smoothstep(burst, 0.6, 1));
    this.glow.material.opacity = glow;
  }
}
