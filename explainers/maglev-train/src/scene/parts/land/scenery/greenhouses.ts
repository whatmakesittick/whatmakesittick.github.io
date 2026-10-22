import { Color, CylinderGeometry } from 'three';
import type { InstancedMesh } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { PartContext } from '../../context';
import type { Field } from '../ground/fields';
import { extent, middle } from '../random';
import { periodicCopies } from './copies';
import { instanced } from './instances';

export const TUNNEL = { height: 2.8, sides: 10 } as const;
const HALF_TURN = Math.PI;
const QUARTER_TURN = Math.PI / 2;
const PLASTIC = new Color('#ffffff');
const TONE_SPREAD = 0.08;

const GREENHOUSE_FINISH: MaterialFinish = { color: '#e4e8e2', roughness: 0.38 };

interface Tunnel {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly length: number;
  readonly tone: number;
}

function tunnelGeometry(): CylinderGeometry {
  return new CylinderGeometry(1, 1, 1, TUNNEL.sides, 1, false, -QUARTER_TURN, HALF_TURN)
    .rotateX(-QUARTER_TURN)
    .deleteAttribute('uv');
}

export function tunnels(fields: readonly Field[]): Tunnel[] {
  return fields
    .filter((field) => field.kind === 'greenhouse')
    .map((field) => ({
      x: middle(field.x),
      z: middle(field.z),
      width: extent(field.x),
      length: extent(field.z),
      tone: field.tone,
    }));
}

export function buildGreenhouses(
  context: PartContext,
  fields: readonly Field[],
  period: number,
  reach: number,
): InstancedMesh {
  const copies = periodicCopies(tunnels(fields), period, reach);
  return instanced(
    context,
    tunnelGeometry(),
    GREENHOUSE_FINISH,
    copies.map((tunnel) => ({
      position: [tunnel.x, 0, tunnel.z],
      turn: 0,
      scale: [tunnel.width / 2, TUNNEL.height, tunnel.length],
      colour: PLASTIC.clone().multiplyScalar(1 - tunnel.tone * TONE_SPREAD),
    })),
    'greenhouses',
  );
}
