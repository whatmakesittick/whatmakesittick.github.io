import { LatheGeometry, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { clamp, toRadians } from '@core/math';
import type { Point } from '../../ids';
import { BEAKER_LOOK, DETAIL } from '../constants';

export interface BeakerShape {
  readonly innerRadius: number;
  readonly glass: number;
  readonly height: number;
  readonly spoutDeg: number;
}

export interface BeakerSurfaces {
  readonly outer: BufferGeometry;
  readonly inner: BufferGeometry;
}

const QUARTER = Math.PI / 2;
const SEAM_START = Math.PI;
const FULL = Math.PI * 2;

function arc(
  centre: Vector2,
  radius: number,
  from: number,
  to: number,
  steps = DETAIL.profile,
): Vector2[] {
  return Array.from({ length: steps + 1 }, (_, step) => {
    const angle = from + ((to - from) * step) / steps;
    return new Vector2(centre.x + radius * Math.cos(angle), centre.y + radius * Math.sin(angle));
  });
}

function outerProfile({ innerRadius, glass, height }: BeakerShape): Vector2[] {
  const outer = innerRadius + glass;
  const fillet = BEAKER_LOOK.baseFillet;
  const bead = BEAKER_LOOK.rimBead;
  return [
    new Vector2(0, 0),
    ...arc(new Vector2(outer - fillet, fillet), fillet, -QUARTER, 0),
    ...arc(new Vector2(outer, height - bead), bead, -QUARTER, QUARTER),
    new Vector2(innerRadius, height),
  ];
}

function innerProfile({ innerRadius, glass, height }: BeakerShape): Vector2[] {
  const fillet = BEAKER_LOOK.baseFillet - glass * 0.5;
  return [
    new Vector2(innerRadius, height),
    ...arc(new Vector2(innerRadius - fillet, glass + fillet), fillet, 0, -QUARTER),
    new Vector2(0, glass),
  ];
}

function formSpout(geometry: BufferGeometry, { height, spoutDeg }: BeakerShape): BufferGeometry {
  const position = geometry.getAttribute('position');
  const spout = toRadians(spoutDeg);
  const { spoutDepth, spoutReach, spoutRise, spoutSharpness } = BEAKER_LOOK;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const radius = Math.hypot(x, z);
    if (radius === 0) continue;
    const toward = Math.max(0, Math.cos(Math.atan2(x, z) - spout)) ** spoutSharpness;
    const depth = clamp((y - (height - spoutDepth)) / spoutDepth, 0, 1) ** 2;
    const reach = (radius + spoutReach * toward * depth) / radius;
    position.setXYZ(index, x * reach, y + spoutRise * toward * depth, z * reach);
  }
  position.needsUpdate = true;
  return geometry;
}

export function spoutLip({ innerRadius, glass, height, spoutDeg }: BeakerShape): Point {
  const reach = innerRadius + glass + BEAKER_LOOK.rimBead + BEAKER_LOOK.spoutReach;
  const angle = toRadians(spoutDeg);
  return [reach * Math.sin(angle), height + BEAKER_LOOK.spoutRise, reach * Math.cos(angle)];
}

function lathe(profile: Vector2[]): BufferGeometry {
  return new LatheGeometry(profile, DETAIL.lathe, SEAM_START, FULL);
}

export function beakerSurfaces(shape: BeakerShape): BeakerSurfaces {
  return {
    outer: formSpout(lathe(outerProfile(shape)), shape),
    inner: formSpout(lathe(innerProfile(shape)), shape),
  };
}

export function liquidColumn(radius: number, dip: number, rings: number): BufferGeometry {
  const top = Array.from({ length: rings + 1 }, (_, ring) => {
    const share = 1 - ring / rings;
    return new Vector2(radius * share, 1 - dip * (1 - share * share));
  });
  return lathe([new Vector2(0, 0), new Vector2(radius, 0), ...top]);
}
