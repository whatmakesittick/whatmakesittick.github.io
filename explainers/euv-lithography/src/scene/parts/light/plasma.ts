import { Mesh, MeshBasicMaterial, PointLight, SphereGeometry } from 'three';
import type { Object3D, Sprite } from 'three';
import type { AssemblyState } from '../../../ids';
import { waypoint } from '../../../model/layout';
import { THEME } from '../../../theme';
import { glowSprite } from '../kit';
import { namedGroup, registeredMaterial } from '../context';
import type { Frame, PartContext } from '../context';
import {
  CORE_RADIUS_M,
  FLARE_OPACITIES,
  FLARE_SIZES_M,
  FLARE_WHITE,
  PLASMA_LIGHT,
  SHIMMER,
} from './dims';
import { plasmaLevel } from './levels';

const GROUP = 'plasma';
const CORE_SEGMENTS = [16, 12] as const;
const FLARE_COLORS = [FLARE_WHITE, THEME.plasma, THEME.plasma, THEME.plasma] as const;

export class PlasmaPart {
  readonly object: Object3D = namedGroup('plasma');
  private readonly core: Mesh;
  private readonly coreMaterial: MeshBasicMaterial;
  private readonly flares: Sprite[];
  private readonly light: PointLight;
  private units = 0;

  constructor(context: PartContext) {
    this.object.position.set(...waypoint('plasma'));
    this.coreMaterial = registeredMaterial(
      context,
      GROUP,
      new MeshBasicMaterial({ color: FLARE_WHITE, transparent: true }),
    );
    this.core = new Mesh(
      context.tracker.track(new SphereGeometry(CORE_RADIUS_M, ...CORE_SEGMENTS)),
      this.coreMaterial,
    );
    this.flares = FLARE_SIZES_M.map((size, index) =>
      glowSprite(context, GROUP, FLARE_COLORS[index], size),
    );
    this.light = new PointLight(THEME.plasma, 0, PLASMA_LIGHT.distance, PLASMA_LIGHT.decay);
    this.object.add(this.core, ...this.flares, this.light);
    this.paint(1);
  }

  setState(state: AssemblyState): void {
    this.units = state.flash.units;
    this.paint(1);
  }

  animate(frame: Frame, state: AssemblyState): boolean {
    this.units = state.flash.units;
    this.paint(state.playing ? this.shimmer(frame.elapsed) : 1);
    return state.playing && plasmaLevel(this.units) > 0;
  }

  private shimmer(elapsed: number): number {
    const { speedA, speedB, depthA, depthB } = SHIMMER;
    return 1 + depthA * Math.sin(elapsed * speedA) + depthB * Math.sin(elapsed * speedB + 1);
  }

  private paint(shimmer: number): void {
    const level = plasmaLevel(this.units);
    const lit = level * shimmer;
    this.coreMaterial.opacity = Math.min(1, lit);
    this.core.scale.setScalar(Math.max(level, 0.001) * shimmer);
    this.flares.forEach((flare, index) => {
      flare.material.opacity = Math.min(1, lit * FLARE_OPACITIES[index]);
      flare.scale.setScalar(FLARE_SIZES_M[index] * Math.max(Math.sqrt(level), 0.001) * shimmer);
    });
    this.light.intensity = PLASMA_LIGHT.intensity * lit;
  }
}
