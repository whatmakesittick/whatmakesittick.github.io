import { DoubleSide, Group, Mesh, MeshStandardMaterial, Object3D } from 'three';
import { lerp } from '@core/math';
import { GAS, RENDER_ORDER } from '../constants';
import { verticalCylinder } from '../geometry/primitives';
import type { GasAppearance } from '../gasAppearance';
import type { PartContext } from './context';

export interface ChamberPart {
  object: Group;
  labelAnchor: Object3D;
  update(
    crownHeight: number,
    headFaceHeight: number,
    appearance: GasAppearance,
    emphasis: number,
  ): void;
}

const GAS_ROUGHNESS = 0.9;
const UNIT_HEIGHT = 1;
const LABEL_RADIUS_FRACTION = 0.55;

function gasMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    metalness: 0,
    roughness: GAS_ROUGHNESS,
    toneMapped: false,
  });
}

export function chamberFactory(context: PartContext): (z: number) => ChamberPart {
  const radius = context.dims.boreRadius - GAS.wallGap;
  const geometry = context.tracker.track(verticalCylinder(radius, 0, UNIT_HEIGHT));
  return (z) => {
    const object = new Group();
    object.position.z = z;
    const material = context.tracker.track(gasMaterial());
    const gas = new Mesh(geometry, material);
    gas.renderOrder = RENDER_ORDER.gas;
    object.add(gas);
    const labelAnchor = new Object3D();
    object.add(labelAnchor);
    return {
      object,
      labelAnchor,
      update: (crownHeight, headFaceHeight, appearance, emphasis) => {
        const bottom = crownHeight + GAS.faceGap;
        const height = Math.max(GAS.faceGap, headFaceHeight - GAS.faceGap - bottom);
        gas.position.y = bottom;
        gas.scale.y = height;
        material.color.copy(appearance.color);
        material.emissive.copy(appearance.emissive);
        material.emissiveIntensity = appearance.emissiveIntensity;
        material.opacity = appearance.opacity * lerp(GAS.dimmedOpacity, 1, emphasis);
        labelAnchor.position.set(radius * LABEL_RADIUS_FRACTION, bottom + height / 2, 0);
      },
    };
  };
}
