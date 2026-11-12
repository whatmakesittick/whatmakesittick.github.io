import { Matrix4 } from 'three';
import type { InstancedMesh, Vector3 } from 'three';
import { HERO_SIGHTS } from './dims';
import type { Footprint } from './dims';

const HIDDEN = new Matrix4().makeScale(0, 0, 0);

const segment = { enter: 0, leave: 1 };

function narrow(start: number, step: number, min: number, max: number): boolean {
  if (step === 0) return start >= min && start <= max;
  const first = (min - start) / step;
  const second = (max - start) / step;
  segment.enter = Math.max(segment.enter, Math.min(first, second));
  segment.leave = Math.min(segment.leave, Math.max(first, second));
  return segment.enter <= segment.leave;
}

export function crosses(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  rect: Footprint,
): boolean {
  segment.enter = 0;
  segment.leave = 1;
  return (
    narrow(fromX, toX - fromX, rect.minX, rect.maxX) &&
    narrow(fromZ, toZ - fromZ, rect.minZ, rect.maxZ)
  );
}

export function hidesHero(camera: Readonly<Vector3>, rect: Footprint): boolean {
  for (const [x, z] of HERO_SIGHTS) {
    if (crosses(camera.x, camera.z, x, z, rect)) return true;
  }
  return false;
}

interface Member {
  mesh: InstancedMesh;
  row: number;
  index: number;
  matrix: Matrix4;
}

export class RowSwitch {
  private readonly footprints: readonly Footprint[];
  private readonly shown: boolean[];
  private readonly members: Member[] = [];

  constructor(footprints: readonly Footprint[]) {
    this.footprints = footprints;
    this.shown = footprints.map(() => true);
  }

  add(mesh: InstancedMesh, row: number, index: number, matrix: Matrix4): void {
    this.members.push({ mesh, row, index, matrix });
  }

  isShown(row: number): boolean {
    return this.shown[row];
  }

  follow(camera: Readonly<Vector3>): boolean {
    let changed = false;
    for (let row = 0; row < this.footprints.length; row += 1) {
      const next = !hidesHero(camera, this.footprints[row]);
      if (next === this.shown[row]) continue;
      this.shown[row] = next;
      changed = true;
    }
    if (changed) this.apply();
    return changed;
  }

  private apply(): void {
    this.members.forEach(({ mesh, row, index, matrix }) => {
      mesh.setMatrixAt(index, this.shown[row] ? matrix : HIDDEN);
      mesh.instanceMatrix.needsUpdate = true;
    });
  }
}
