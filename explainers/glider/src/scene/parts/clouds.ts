import { CircleGeometry, Group, IcosahedronGeometry, SphereGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CUMULUS_BASE, FIELD, FLIGHT_CYCLE, thermalAxisX } from '../../model';
import { CLOUD_BASE_Y, CUMULUS, LENTICULAR, ROTOR_CLOUD } from '../constants';
import { anchorAt, partMesh } from './context';
import type { PartContext } from './context';

export interface CloudAnchors {
  cumulus: Object3D;
  rotor: Object3D;
  lenticular: Object3D;
}

const HALF_TURN = Math.PI;
const FULL_TURN = Math.PI * 2;
const ROTOR_SEEDS = { angle: 2.399, reach: 0.618 } as const;
const CHURN_PER_SECOND = (FULL_TURN * ROTOR_CLOUD.turnsPerLoop) / FLIGHT_CYCLE;

export const CUMULUS_CENTER = {
  x: thermalAxisX(CUMULUS_BASE) + CUMULUS.downwind,
  y: CLOUD_BASE_Y,
  z: FIELD.z,
} as const;

function merged(parts: BufferGeometry[]): BufferGeometry {
  const geometry = mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part)));
  parts.forEach((part) => part.dispose());
  return geometry;
}

function puffDome(radius: number): BufferGeometry {
  const dome = new SphereGeometry(
    radius,
    CUMULUS.widthSegments,
    CUMULUS.heightSegments,
    0,
    FULL_TURN,
    0,
    HALF_TURN / 2,
  );
  const base = new CircleGeometry(radius, CUMULUS.widthSegments);
  base.rotateX(HALF_TURN / 2);
  return merged([dome, base]);
}

function cumulusGeometry(): BufferGeometry {
  return merged(
    CUMULUS.puffs.map(([x, y, z, radius]) => {
      const puff = puffDome(radius);
      puff.translate(x, y, z);
      return puff;
    }),
  );
}

function rotorGeometry(): BufferGeometry {
  const [smallest, largest] = ROTOR_CLOUD.puffRadius;
  return merged(
    Array.from({ length: ROTOR_CLOUD.puffCount }, (_, index) => {
      const share = index / (ROTOR_CLOUD.puffCount - 1);
      const swirl = (index * ROTOR_SEEDS.reach) % 1;
      const puff = new IcosahedronGeometry(
        smallest + (largest - smallest) * swirl,
        ROTOR_CLOUD.detail,
      );
      const angle = index * ROTOR_SEEDS.angle;
      const reach = ROTOR_CLOUD.radius * swirl;
      puff.translate(
        reach * Math.cos(angle),
        reach * Math.sin(angle),
        (share * 2 - 1) * ROTOR_CLOUD.halfLength,
      );
      return puff;
    }),
  );
}

function lenticularGeometry(): BufferGeometry {
  return merged(
    LENTICULAR.plates.map(({ x, y, length, thickness, depth }) => {
      const plate = new SphereGeometry(1, LENTICULAR.widthSegments, LENTICULAR.heightSegments);
      plate.scale(length, thickness, depth);
      plate.translate(x, y, 0);
      return plate;
    }),
  );
}

export class CloudsPart {
  readonly object = new Group();
  readonly anchors: CloudAnchors;
  private readonly rotor = new Group();

  constructor(context: PartContext) {
    const cumulus = new Group();
    cumulus.position.set(CUMULUS_CENTER.x, CUMULUS_CENTER.y, CUMULUS_CENTER.z);
    cumulus.add(partMesh(context, cumulusGeometry(), 'cumulus', 'cumulus'));
    this.rotor.position.set(ROTOR_CLOUD.x, ROTOR_CLOUD.y, 0);
    this.rotor.add(partMesh(context, rotorGeometry(), 'rotor', 'rotor'));
    const lenticular = new Group();
    lenticular.position.set(LENTICULAR.x, LENTICULAR.y, 0);
    lenticular.add(partMesh(context, lenticularGeometry(), 'lenticular', 'lenticular'));
    this.object.add(cumulus, this.rotor, lenticular);
    const rotorLabelZ = ROTOR_CLOUD.halfLength * ROTOR_CLOUD.labelShare;
    const lenticularLabelX = -LENTICULAR.plates[0].length * LENTICULAR.labelShare;
    this.anchors = {
      cumulus: anchorAt(cumulus, 0, CUMULUS.labelHeight, CUMULUS.labelReach),
      rotor: anchorAt(this.object, ROTOR_CLOUD.x, ROTOR_CLOUD.y, rotorLabelZ),
      lenticular: anchorAt(lenticular, lenticularLabelX, 0, 0),
    };
  }

  update(time: number): void {
    this.rotor.rotation.z = -CHURN_PER_SECOND * time;
  }
}
