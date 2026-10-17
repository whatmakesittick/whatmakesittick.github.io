import { Mesh } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { CarReading } from '../../../ids';
import { CAR } from '../../../model/layout';
import {
  shadowPadMaterial,
  shadowPadPlane,
  shadowPadTexture,
} from '../../geometry/effects/shadowPad';
import type { ShadowPadLayout } from '../../geometry/effects/shadowPad';
import { WHEEL } from '../car/dimensions';
import { registered } from '../context';
import type { PartContext } from '../context';
import { CONTACT_SHADOW } from './constants';

export const CONTACT_SHADOW_NAME = 'contactShadow';

export function contactShadowLayout(): ShadowPadLayout {
  const { size, pad, padCorner, padBlur, padAlpha, tyre, tyreAlpha } = CONTACT_SHADOW;
  const across = [-WHEEL.trackHalfZ, WHEEL.trackHalfZ];
  return {
    size: [CAR.length * size[0], CAR.width * size[1]],
    pad: [CAR.length * pad[0], CAR.width * pad[1]],
    padCorner,
    padBlur,
    padAlpha,
    spots: [WHEEL.frontX, WHEEL.rearX].flatMap((x) => across.map((z) => [x, z] as const)),
    spot: tyre,
    spotAlpha: tyreAlpha,
  };
}

export class ContactShadow {
  readonly mesh: Mesh;

  constructor(context: PartContext) {
    const layout = contactShadowLayout();
    const geometry = shadowPadPlane(layout);
    const material = registered(
      context,
      STRUCTURE_GROUP,
      shadowPadMaterial(context.tracker.track(shadowPadTexture(layout))),
    );
    this.mesh = new Mesh(context.tracker.track(geometry), material);
    this.mesh.name = CONTACT_SHADOW_NAME;
    this.mesh.visible = false;
  }

  setState(car: CarReading): void {
    this.mesh.visible = car.onGround;
    if (!car.onGround) return;
    const { offset, lift } = CONTACT_SHADOW;
    this.mesh.position.set(car.position[0] + offset[0], lift, car.position[2] + offset[1]);
  }
}
