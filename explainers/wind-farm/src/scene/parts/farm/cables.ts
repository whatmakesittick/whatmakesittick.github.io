import type { DataTexture } from 'three';
import { createMaterial } from '@core/scene/materials';
import type { AssemblyState, SpacingD } from '../../../ids';
import { registeredMaterial } from '../context';
import type { Motion, PartContext } from '../context';
import { CABLE, CABLE_FINISH } from './constants';
import { midpoint, onGround } from './ground';
import { ribbons, SpacingLayer } from './layer';
import type { LayerShape } from './layer';
import { farmRoutes, feederRoutes } from './routes';
import { dashTexture } from './textures';

const LABEL_ROW = 1;
const CACHE_KEY = 'farmCollectorCable';
const WIDEN_DECLARATIONS = 'attribute vec3 lateral;\nuniform float cableWiden;\nvoid main() {';
const WIDEN_VERTEX = '#include <begin_vertex>\ntransformed += lateral * cableWiden;';

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
  private readonly widen = { value: 0 };

  constructor(context: PartContext) {
    this.dashes = context.tracker.track(dashTexture());
    const material = createMaterial({ ...CABLE_FINISH, emissiveMap: this.dashes });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.cableWiden = this.widen;
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', WIDEN_DECLARATIONS)
        .replace('#include <begin_vertex>', WIDEN_VERTEX);
    };
    material.customProgramCacheKey = () => CACHE_KEY;
    registeredMaterial(context, 'collectorCables', material);
    this.layer = new SpacingLayer(context, 'collectorCables', material, cableShape);
  }

  setState(state: AssemblyState): void {
    this.layer.group.visible = state.view.cables;
  }

  animate(motion: Motion, state: AssemblyState): boolean {
    if (!this.layer.group.visible) return false;
    this.widen.value = Math.max(0, motion.cameraDistance * CABLE.widenPerMetre - CABLE.width / 2);
    const share = state.farm.outputShare;
    if (share <= 0) return false;
    const shift = (motion.delta * CABLE.flowSpeed * share) / CABLE.dashPeriod;
    this.dashes.offset.x = (this.dashes.offset.x - shift) % 1;
    return true;
  }
}
