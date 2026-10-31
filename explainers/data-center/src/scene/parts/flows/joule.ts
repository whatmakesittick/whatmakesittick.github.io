import type { Object3D } from 'three';
import type { JouleReading } from '../../../ids';
import { label, namedGroup, sceneAnchor } from '../context';
import type { PartContext } from '../context';
import { BEAD, HALO_STOPS, RENDER_ORDER } from './constants';
import { Cloud, gradientTexture } from './points';

const ORIGIN = [0, 0, 0] as const;

export class JouleBead {
  readonly object: Object3D;
  private readonly core: Cloud;
  private readonly halo: Cloud;
  private heat = false;

  constructor(context: PartContext, parent: Object3D) {
    this.object = namedGroup('joule', parent);
    this.core = new Cloud(context, 'joule', 1, {
      texture: context.textures.dot,
      size: BEAD.core,
      worldSize: true,
      renderOrder: RENDER_ORDER.bead,
    });
    this.halo = new Cloud(context, 'joule', 1, {
      texture: gradientTexture(context, HALO_STOPS),
      size: BEAD.halo,
      worldSize: true,
      depthTest: false,
      pull: false,
      renderOrder: RENDER_ORDER.halo,
    });
    this.object.add(this.halo.object, this.core.object);
    label(context, 'joule', this.object, ORIGIN);
    sceneAnchor(context, 'joule', this.object, ORIGIN);
    this.tint();
  }

  setState(reading: JouleReading): void {
    this.object.position.set(...reading.position);
    const heat = reading.form === 'heat';
    if (heat === this.heat) return;
    this.heat = heat;
    this.tint();
  }

  scale(cameraDistance: number): void {
    const distance = Math.max(cameraDistance, BEAD.minDistance);
    this.core.material.size = BEAD.core * distance;
    this.halo.material.size = BEAD.halo * distance;
  }

  private tint(): void {
    this.core.set(0, 0, 0, 0, this.heat ? BEAD.heatCoreTint : BEAD.coreTint, 1);
    this.halo.set(0, 0, 0, 0, this.heat ? BEAD.heatTint : BEAD.currentTint, 1);
    this.core.commit();
    this.halo.commit();
  }
}
