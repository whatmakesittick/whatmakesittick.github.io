import { Vector3 } from 'three';
import type { ElementId, OdorantId } from '../../../ids';

export interface ShapeAtom {
  readonly element: ElementId;
  readonly at: Vector3;
}

export interface ShapeBond {
  readonly from: number;
  readonly to: number;
  readonly double: boolean;
}

export interface MoleculeShape {
  readonly atoms: readonly ShapeAtom[];
  readonly bonds: readonly ShapeBond[];
}

const DEG = Math.PI / 180;
const RING_CC = 1.39;
const CH = 1.08;
const CC = 1.48;
const CO_DOUBLE = 1.21;
const CO_SINGLE = 1.36;
const ZIG = 1.45;
const SIX = 6;
const OUT_OF_PLANE = 0.75;

class Builder {
  readonly atoms: ShapeAtom[] = [];
  readonly bonds: ShapeBond[] = [];

  add(element: ElementId, at: Vector3, bondTo?: number, double = false): number {
    this.atoms.push({ element, at });
    const index = this.atoms.length - 1;
    if (bondTo !== undefined) this.bonds.push({ from: bondTo, to: index, double });
    return index;
  }

  from(index: number, length: number, angleDeg: number, lift = 0): Vector3 {
    const origin = this.atoms[index].at;
    return new Vector3(
      origin.x + Math.cos(angleDeg * DEG) * length,
      origin.y + Math.sin(angleDeg * DEG) * length,
      origin.z + lift,
    );
  }

  bond(from: number, to: number, double = false): void {
    this.bonds.push({ from, to, double });
  }

  ring(radius: number, startDeg: number, doubles: readonly number[]): number[] {
    const ring = Array.from({ length: SIX }, (_, step) =>
      this.add(
        'C',
        new Vector3(
          Math.cos((startDeg + step * 60) * DEG) * radius,
          Math.sin((startDeg + step * 60) * DEG) * radius,
          0,
        ),
      ),
    );
    ring.forEach((atom, step) => this.bond(atom, ring[(step + 1) % SIX], doubles.includes(step)));
    return ring;
  }

  zigzag(
    start: number,
    count: number,
    firstDeg: number,
    doubles: readonly number[] = [],
  ): number[] {
    const chain = [start];
    for (let step = 0; step < count; step += 1) {
      const angle = firstDeg + (step % 2 === 0 ? 0 : -60) * Math.sign(firstDeg || 1);
      const previous = chain[chain.length - 1];
      chain.push(this.add('C', this.from(previous, ZIG, angle), previous, doubles.includes(step)));
    }
    return chain;
  }

  build(): MoleculeShape {
    const centre = this.atoms
      .reduce((sum, atom) => sum.add(atom.at), new Vector3())
      .divideScalar(this.atoms.length);
    this.atoms.forEach((atom) => atom.at.sub(centre));
    return { atoms: this.atoms, bonds: this.bonds };
  }
}

function benzaldehyde(): MoleculeShape {
  const shape = new Builder();
  const ring = shape.ring(RING_CC, 0, [0, 2, 4]);
  ring.slice(1).forEach((atom, step) => {
    const angle = (step + 1) * 60;
    shape.add('H', shape.from(atom, CH, angle), atom);
  });
  const carbonyl = shape.add('C', shape.from(ring[0], CC, 0), ring[0]);
  shape.add('O', shape.from(carbonyl, CO_DOUBLE, 60), carbonyl, true);
  shape.add('H', shape.from(carbonyl, CH, -60), carbonyl);
  return shape.build();
}

function hexenal(): MoleculeShape {
  const shape = new Builder();
  const first = shape.add('C', new Vector3(0, 0, 0));
  shape.add('O', shape.from(first, CO_DOUBLE, 150), first, true);
  shape.zigzag(first, 5, 30, [1]);
  return shape.build();
}

function linalool(): MoleculeShape {
  const shape = new Builder();
  const first = shape.add('C', new Vector3(0, 0, 0));
  const chain = shape.zigzag(first, 7, 30, [0, 5]);
  shape.add('O', shape.from(chain[2], CO_SINGLE, 90, OUT_OF_PLANE), chain[2]);
  shape.add('C', shape.from(chain[2], ZIG, 90, -OUT_OF_PLANE), chain[2]);
  shape.add('C', shape.from(chain[6], ZIG, 90), chain[6]);
  return shape.build();
}

function eugenol(): MoleculeShape {
  const shape = new Builder();
  const ring = shape.ring(RING_CC, 90, [0, 2, 4]);
  shape.add('O', shape.from(ring[0], CO_SINGLE, 90), ring[0]);
  const ether = shape.add('O', shape.from(ring[1], CO_SINGLE, 150), ring[1]);
  shape.add('C', shape.from(ether, ZIG, 210), ether);
  const allyl = shape.add('C', shape.from(ring[3], CC, 270), ring[3]);
  const middle = shape.add('C', shape.from(allyl, ZIG, 330), allyl);
  shape.add('C', shape.from(middle, ZIG, 270), middle, true);
  return shape.build();
}

function ionone(): MoleculeShape {
  const shape = new Builder();
  const ring = shape.ring(ZIG, 30, [4]);
  shape.add('C', shape.from(ring[0], ZIG, 60, OUT_OF_PLANE), ring[0]);
  shape.add('C', shape.from(ring[0], ZIG, 0, -OUT_OF_PLANE), ring[0]);
  shape.add('C', shape.from(ring[4], ZIG, 270), ring[4]);
  const first = shape.add('C', shape.from(ring[5], ZIG, 330), ring[5]);
  const second = shape.add('C', shape.from(first, ZIG, 30), first, true);
  const carbonyl = shape.add('C', shape.from(second, ZIG, 330), second);
  shape.add('O', shape.from(carbonyl, CO_DOUBLE, 270), carbonyl, true);
  shape.add('C', shape.from(carbonyl, ZIG, 30), carbonyl);
  return shape.build();
}

export const MOLECULE_SHAPES: Readonly<Record<OdorantId, MoleculeShape>> = {
  benzaldehyde: benzaldehyde(),
  hexenal: hexenal(),
  linalool: linalool(),
  eugenol: eugenol(),
  ionone: ionone(),
};
