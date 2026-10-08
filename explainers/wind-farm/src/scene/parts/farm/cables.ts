import type { DataTexture } from 'three';
import type { AssemblyState, SpacingD } from '../../../ids';
import type { Motion, PartContext } from '../context';
import { CABLE, CABLE_FINISH } from './constants';
import { midpoint, onGround } from './ground';
import { ribbons, SpacingLayer } from './layer';
import type { LayerShape } from './layer';
import { farmRoutes, feederRoutes } from './routes';
import { dashTexture } from './textures';
import { GroundWidening } from './widening';

const LABEL_ROW = 1;
const PART = 'collectorCables';

function cableShape(spacing: SpacingD): LayerShape {
  const routes = farmRoutes(spacing);
  const options = { width: CABLE.width, lift: CABLE.lift, period: CABLE.dashPeriod };
  const geometry = ribbons([
    { routes, options },
    { routes: feederRoutes(spacing), options },
  ]);
  const row = routes[LABEL_ROW];
  const leg = midpoint(row[row.length - 2], row[row.length - 1]);
  return { geometry, label: onGround(leg, CABLE.lift) };
}

export class CollectorCables {
  readonly layer: SpacingLayer;
  private readonly dashes: DataTexture;

  constructor(context: PartContext) {
    this.dashes = context.tracker.track(dashTexture());
    const widening = new GroundWidening(
      context,
      PART,
      { ...CABLE_FINISH, emissiveMap: this.dashes },
      { halfWidth: CABLE.width / 2, perMetre: CABLE.widenPerMetre },
    );
    this.layer = new SpacingLayer(context, PART, widening, cableShape);
  }

  setState(state: AssemblyState): void {
    this.layer.group.visible = state.view.cables;
  }

  animate(motion: Motion, state: AssemblyState): boolean {
    if (!this.layer.group.visible) return false;
    const share = state.farm.outputShare;
    if (share <= 0) return false;
    const shift = (motion.delta * CABLE.flowSpeed * share) / CABLE.dashPeriod;
    this.dashes.offset.x = (this.dashes.offset.x - shift) % 1;
    return true;
  }
}
