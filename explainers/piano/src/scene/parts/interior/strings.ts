import { CylinderGeometry, InstancedBufferAttribute, Matrix4, Quaternion, Vector3 } from 'three';
import type { Group, InstancedMesh, Material, MeshStandardMaterialParameters } from 'three';
import { FULL_TURN } from '@core/math';
import type { Point } from '../../../ids';
import { FINISHES } from '../../finishes';
import { namedGroup } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { STRING_RADIUS, WINDING } from './constants';
import { PIANO_STRINGS, pointAlong, stringsIn } from './layout';
import type { Band, PianoString } from './layout';
import { instances, patchedMaterial } from './materials';
import type { VertexPatch } from './patches';
import { distance, speakingEnd } from './stringEnds';
import { WINDING_TILE, windingTexture } from './winding';

const RADIAL_SIDES = 6;
const LENGTH_SEGMENTS = 10;
const GOLDEN_SHARE = 0.618034;
const SHIMMER_ITEMS = 3;
const PARITY = 2;
const HIDDEN = new Matrix4().makeScale(0, 0, 0);
const NO_SHIMMER: readonly number[] = [2, 3, 0];
const UP = new Vector3(0, 1, 0);

interface Span {
  readonly string: PianoString;
  readonly start: Point;
  readonly end: Point;
}

interface BandSpec {
  readonly spans: readonly Span[];
  readonly radius: number;
  readonly group: EmphasisGroup;
  readonly material: Material;
  readonly still?: boolean;
}

export function shimmerPhase(order: number): number {
  return ((order * GOLDEN_SHARE) % 1) * FULL_TURN;
}

function unitString(radius: number, segments: number): CylinderGeometry {
  const geometry = new CylinderGeometry(radius, radius, 1, RADIAL_SIDES, segments, true);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, 0, 1 / 2);
  return geometry;
}

function spanMatrix({ start, end }: Span, target: Matrix4): Matrix4 {
  const length = distance(start, end);
  const turn = new Quaternion().setFromAxisAngle(
    UP,
    Math.atan2(end[0] - start[0], end[2] - start[2]),
  );
  return target.compose(new Vector3(...start), turn, new Vector3(1, 1, length));
}

function shimmerOf(span: Span, still: boolean): readonly number[] {
  if (still) return NO_SHIMMER;
  const length = distance(span.start, span.end);
  const from = distance(span.start, span.string.front) / length;
  const to = distance(span.start, speakingEnd(span.string)) / length;
  return [from, to, shimmerPhase(span.string.order)];
}

export class StringBand {
  readonly mesh: InstancedMesh;
  private readonly slots = new Map<number, number[]>();
  private readonly spans: readonly Span[];
  private readonly evens: number;

  constructor(context: PartContext, spec: BandSpec) {
    this.spans = [...spec.spans].sort(
      (a, b) =>
        (a.string.order % PARITY) - (b.string.order % PARITY) || a.string.order - b.string.order,
    );
    this.evens = this.spans.filter((span) => span.string.order % PARITY === 0).length;
    const segments = spec.still ? 1 : LENGTH_SEGMENTS;
    this.mesh = instances(
      context,
      unitString(spec.radius, segments),
      spec.material,
      this.spans.length,
    );
    const shimmer = new Float32Array(this.spans.length * SHIMMER_ITEMS);
    const matrix = new Matrix4();
    this.spans.forEach((span, index) => {
      this.slots.set(span.string.order, [...(this.slots.get(span.string.order) ?? []), index]);
      this.mesh.setMatrixAt(index, spanMatrix(span, matrix));
      shimmer.set(shimmerOf(span, spec.still ?? false), index * SHIMMER_ITEMS);
    });
    this.mesh.geometry.setAttribute(
      'aShimmer',
      new InstancedBufferAttribute(shimmer, SHIMMER_ITEMS),
    );
    this.mesh.computeBoundingSphere();
    this.mesh.name = spec.group;
  }

  setHidden(strings: readonly PianoString[], hidden: boolean): void {
    const matrix = new Matrix4();
    strings.forEach((string) =>
      this.slots.get(string.order)?.forEach((slot) => {
        this.mesh.setMatrixAt(slot, hidden ? HIDDEN : spanMatrix(this.spans[slot], matrix));
      }),
    );
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  setThin(thin: boolean): void {
    this.mesh.count = thin ? this.evens : this.spans.length;
  }
}

function speakingSpan(string: PianoString): Span {
  return { string, start: string.front, end: string.hitch };
}

function pinSpan(string: PianoString): Span {
  return { string, start: string.pin, end: string.front };
}

function windingSpan(string: PianoString): Span {
  return {
    string,
    start: pointAlong(string.front, string.direction, WINDING.frontGap),
    end: speakingEnd(string),
  };
}

function averageLength(spans: readonly Span[]): number {
  return spans.reduce((sum, span) => sum + distance(span.start, span.end), 0) / spans.length;
}

export interface StringSets {
  readonly bass: Group;
  readonly steel: Group;
  readonly bands: readonly StringBand[];
}

export function createStringSets(context: PartContext, shimmer: VertexPatch): StringSets {
  const material = (
    group: EmphasisGroup,
    finish: MeshStandardMaterialParameters,
    extra?: MeshStandardMaterialParameters,
  ) => patchedMaterial(context, { group, finish, patch: shimmer, extra });
  const bassStrings = stringsIn('bass');
  const windings = bassStrings.map(windingSpan);
  const steelMaterial = material('stringSet', FINISHES.steel);
  const coreMaterial = material('bassStrings', FINISHES.steel);
  const steelStrings = PIANO_STRINGS.filter((string) => string.band !== 'bass');
  const band = (name: Band, radius: number) =>
    new StringBand(context, {
      spans: stringsIn(name).map(speakingSpan),
      radius,
      group: 'stringSet',
      material: steelMaterial,
    });
  const bands = [
    band('treble', STRING_RADIUS.steel),
    band('tenor', STRING_RADIUS.tenor),
    new StringBand(context, {
      spans: steelStrings.map(pinSpan),
      radius: STRING_RADIUS.tenor,
      group: 'stringSet',
      material: steelMaterial,
      still: true,
    }),
    new StringBand(context, {
      spans: bassStrings.map(speakingSpan),
      radius: STRING_RADIUS.core,
      group: 'bassStrings',
      material: coreMaterial,
    }),
    new StringBand(context, {
      spans: bassStrings.map(pinSpan),
      radius: STRING_RADIUS.core,
      group: 'bassStrings',
      material: coreMaterial,
      still: true,
    }),
    new StringBand(context, {
      spans: windings,
      radius: STRING_RADIUS.wound,
      group: 'bassStrings',
      material: material('bassStrings', FINISHES.copper, {
        bumpMap: windingTexture(context, averageLength(windings) / WINDING_TILE),
      }),
    }),
  ];
  const steel = namedGroup('stringSet');
  const bass = namedGroup('bassStrings');
  bands.forEach((item) => (item.mesh.name === 'bassStrings' ? bass : steel).add(item.mesh));
  return { bass, steel, bands };
}
