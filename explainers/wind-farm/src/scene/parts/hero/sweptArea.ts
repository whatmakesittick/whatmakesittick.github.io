import { CircleGeometry, RingGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { ROTOR_RADIUS_M } from '../../../model/constants';
import { FINISHES } from '../../finishes';
import { finishMesh, label, partMesh } from '../context';
import type { PartContext } from '../context';
import { HUB } from './constants';

const DISC = { segments: 96, opacity: 0.06 } as const;
const RING = { width: 0.7, segments: 160 } as const;
const LABEL_HEIGHT = -40;
const DISC_FINISH = { ...FINISHES.sweep, opacity: DISC.opacity };

function facingWind(geometry: BufferGeometry): BufferGeometry {
  geometry.rotateY(Math.PI / 2);
  geometry.translate(...HUB);
  return geometry;
}

export function buildSweptArea(context: PartContext, yaw: Object3D): void {
  const ring = partMesh(
    context,
    facingWind(new RingGeometry(ROTOR_RADIUS_M - RING.width, ROTOR_RADIUS_M, RING.segments)),
    'sweptArea',
  );
  ring.add(
    finishMesh(
      context,
      facingWind(new CircleGeometry(ROTOR_RADIUS_M, DISC.segments)),
      'sweptArea',
      DISC_FINISH,
    ),
  );
  yaw.add(ring);
  const across = Math.sqrt(ROTOR_RADIUS_M ** 2 - LABEL_HEIGHT ** 2);
  label(context, 'sweptArea', ring, [HUB[0], HUB[1] + LABEL_HEIGHT, HUB[2] + across]);
}
