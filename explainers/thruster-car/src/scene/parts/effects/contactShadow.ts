import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { CarReading } from '../../../ids';
import { CAR } from '../../../model/layout';
import { registered } from '../context';
import type { PartContext } from '../context';
import { CONTACT_SHADOW } from './constants';

const FLAT = -Math.PI / 2;
const SHADE = '#000000';
const LAYER_OFFSET = -2;

export const CONTACT_SHADOW_NAME = 'contactShadow';

export class ContactShadow {
  readonly mesh: Mesh;

  constructor(context: PartContext) {
    const geometry = new PlaneGeometry(
      CAR.length * CONTACT_SHADOW.length,
      CAR.width * CONTACT_SHADOW.width,
    );
    geometry.rotateX(FLAT);
    const material = registered(
      context,
      STRUCTURE_GROUP,
      new MeshBasicMaterial({
        map: context.textures.shadow,
        color: SHADE,
        transparent: true,
        opacity: CONTACT_SHADOW.opacity,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: LAYER_OFFSET,
        polygonOffsetUnits: LAYER_OFFSET,
      }),
    );
    this.mesh = new Mesh(context.tracker.track(geometry), material);
    this.mesh.name = CONTACT_SHADOW_NAME;
    this.mesh.visible = false;
  }

  setState(car: CarReading): void {
    this.mesh.visible = car.onGround;
    if (!car.onGround) return;
    const [x, , z] = car.position;
    this.mesh.position.set(x, CONTACT_SHADOW.lift, z);
  }
}
