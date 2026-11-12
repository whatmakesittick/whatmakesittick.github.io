import { BoxGeometry, Euler, InstancedMesh, Matrix4, Quaternion } from 'three';
import type { Material } from 'three';
import type { PartContext } from '../context';
import { placement } from '../kit';

const FACET_PITCH = 0.093;
const FACET_SIZE = 0.084;
const FACET_THICKNESS = 0.012;
const FACET_REACH = 0.43;
const FACET_LIFT = 0.004;
const DISH_SAG = 0.022;
const DISH_RADIUS = 0.5;
const TILT_RANGE = 0.07;
const SEED = 0x5eed;
const LCG_MULTIPLIER = 1664525;
const LCG_INCREMENT = 1013904223;
const LCG_RANGE = 2 ** 32;

function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_RANGE;
    return state / LCG_RANGE;
  };
}

function tiles(): Matrix4[] {
  const next = random(SEED);
  const span = Math.ceil(FACET_REACH / FACET_PITCH);
  const found: Matrix4[] = [];
  for (let row = -span; row <= span; row += 1) {
    for (let column = -span; column <= span; column += 1) {
      const [x, z] = [column * FACET_PITCH, row * FACET_PITCH];
      const radius = Math.hypot(x, z);
      if (radius > FACET_REACH) continue;
      const y = -DISH_SAG * (1 - (radius / DISH_RADIUS) ** 2) + FACET_LIFT;
      const tilt = new Quaternion().setFromEuler(
        new Euler((next() - 0.5) * TILT_RANGE, 0, (next() - 0.5) * TILT_RANGE),
      );
      found.push(placement([x, y, z], [1, 1, 1], tilt));
    }
  }
  return found;
}

export interface FacetField {
  readonly mesh: InstancedMesh;
  place(slot: number, mirror: Matrix4): void;
}

export function facetField(
  context: PartContext,
  material: Material,
  mirrors: readonly Matrix4[],
): FacetField {
  const local = tiles();
  const geometry = context.tracker.track(new BoxGeometry(FACET_SIZE, FACET_THICKNESS, FACET_SIZE));
  const mesh = context.tracker.track(
    new InstancedMesh(geometry, material, Math.max(1, local.length * mirrors.length)),
  );
  mesh.count = local.length * mirrors.length;
  const place = (slot: number, mirror: Matrix4) => {
    local.forEach((tile, index) =>
      mesh.setMatrixAt(slot * local.length + index, new Matrix4().multiplyMatrices(mirror, tile)),
    );
    mesh.instanceMatrix.needsUpdate = true;
  };
  mirrors.forEach((mirror, slot) => place(slot, mirror));
  mesh.frustumCulled = false;
  return { mesh, place };
}
