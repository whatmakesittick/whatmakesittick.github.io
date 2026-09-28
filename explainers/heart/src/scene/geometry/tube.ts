import { BufferAttribute, BufferGeometry, Color, Vector3 } from 'three';
import type { CatmullRomCurve3 } from 'three';

export interface HollowTubeSpec {
  readonly curve: CatmullRomCurve3;
  readonly fromMm: number;
  readonly outer: (distanceMm: number) => number;
  readonly inner: (distanceMm: number) => number;
  readonly segmentMm: number;
  readonly radialSegments: number;
  readonly wallColour: string;
  readonly lumenColour: string;
  readonly plugInsetMm: number;
  readonly plugs: { readonly start: boolean; readonly end: boolean };
  readonly lumenFade?: { readonly colour: string; readonly fromMm: number; readonly toMm: number };
}

const XYZ = 3;
const PLUG_OVERLAP_MM = 0.05;

interface Ring {
  readonly distance: number;
  readonly centre: Vector3;
  readonly tangent: Vector3;
  readonly normal: Vector3;
  readonly binormal: Vector3;
  readonly outer: number;
  readonly inner: number;
}

class MeshBuilder {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly colours: number[] = [];
  readonly index: number[] = [];

  vertex(position: Vector3, normal: Vector3, colour: Color): number {
    this.positions.push(position.x, position.y, position.z);
    this.normals.push(normal.x, normal.y, normal.z);
    this.colours.push(colour.r, colour.g, colour.b);
    return this.positions.length / XYZ - 1;
  }

  quad(a: number, b: number, c: number, d: number): void {
    this.index.push(a, b, c, a, c, d);
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.positions), XYZ));
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(this.normals), XYZ));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(this.colours), XYZ));
    geometry.setIndex(this.index);
    return geometry;
  }
}

function rings(spec: HollowTubeSpec): Ring[] {
  const length = spec.curve.getLength();
  const span = length - spec.fromMm;
  const count = Math.max(2, Math.ceil(span / spec.segmentMm));
  const result: Ring[] = [];
  let normal = new Vector3();
  for (let step = 0; step <= count; step += 1) {
    const distance = spec.fromMm + (span * step) / count;
    const share = Math.min(distance / length, 1);
    const centre = spec.curve.getPointAt(share);
    const tangent = spec.curve.getTangentAt(share).normalize();
    if (step === 0) {
      const helper = Math.abs(tangent.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
      normal = new Vector3().crossVectors(tangent, helper).normalize();
    } else {
      normal = normal.clone().addScaledVector(tangent, -normal.dot(tangent)).normalize();
    }
    const binormal = new Vector3().crossVectors(tangent, normal).normalize();
    result.push({
      distance,
      centre,
      tangent,
      normal,
      binormal,
      outer: spec.outer(distance),
      inner: spec.inner(distance),
    });
  }
  return result;
}

function around(ring: Ring, angle: number): Vector3 {
  return ring.normal
    .clone()
    .multiplyScalar(Math.cos(angle))
    .addScaledVector(ring.binormal, Math.sin(angle));
}

function surfaceRows(
  builder: MeshBuilder,
  all: readonly Ring[],
  spec: HollowTubeSpec,
  colourAt: (distance: number) => Color,
  inward: boolean,
): number[][] {
  const rows = all.map((ring) => {
    const row: number[] = [];
    const colour = colourAt(ring.distance);
    for (let segment = 0; segment <= spec.radialSegments; segment += 1) {
      const direction = around(ring, (segment / spec.radialSegments) * Math.PI * 2);
      const radius = inward ? ring.inner : ring.outer;
      const position = ring.centre.clone().addScaledVector(direction, radius);
      row.push(builder.vertex(position, inward ? direction.clone().negate() : direction, colour));
    }
    return row;
  });
  for (let step = 0; step < rows.length - 1; step += 1) {
    for (let segment = 0; segment < spec.radialSegments; segment += 1) {
      const [a, b] = [rows[step][segment], rows[step][segment + 1]];
      const [c, d] = [rows[step + 1][segment + 1], rows[step + 1][segment]];
      if (inward) builder.quad(a, d, c, b);
      else builder.quad(a, b, c, d);
    }
  }
  return rows;
}

function annulus(
  builder: MeshBuilder,
  ring: Ring,
  spec: HollowTubeSpec,
  colour: Color,
  facing: 1 | -1,
): void {
  const normal = ring.tangent.clone().multiplyScalar(facing);
  const outer: number[] = [];
  const inner: number[] = [];
  for (let segment = 0; segment <= spec.radialSegments; segment += 1) {
    const direction = around(ring, (segment / spec.radialSegments) * Math.PI * 2);
    outer.push(
      builder.vertex(ring.centre.clone().addScaledVector(direction, ring.outer), normal, colour),
    );
    inner.push(
      builder.vertex(ring.centre.clone().addScaledVector(direction, ring.inner), normal, colour),
    );
  }
  for (let segment = 0; segment < spec.radialSegments; segment += 1) {
    const [a, b, c, d] = [outer[segment], outer[segment + 1], inner[segment + 1], inner[segment]];
    if (facing > 0) builder.quad(a, b, c, d);
    else builder.quad(a, d, c, b);
  }
}

function plug(
  builder: MeshBuilder,
  ring: Ring,
  spec: HollowTubeSpec,
  colour: Color,
  facing: 1 | -1,
): void {
  const normal = ring.tangent.clone().multiplyScalar(facing);
  const centre = ring.centre.clone().addScaledVector(ring.tangent, -facing * spec.plugInsetMm);
  const hub = builder.vertex(centre, normal, colour);
  const rim: number[] = [];
  for (let segment = 0; segment <= spec.radialSegments; segment += 1) {
    const direction = around(ring, (segment / spec.radialSegments) * Math.PI * 2);
    rim.push(
      builder.vertex(
        centre.clone().addScaledVector(direction, ring.inner + PLUG_OVERLAP_MM),
        normal,
        colour,
      ),
    );
  }
  for (let segment = 0; segment < spec.radialSegments; segment += 1) {
    if (facing > 0) builder.index.push(hub, rim[segment], rim[segment + 1]);
    else builder.index.push(hub, rim[segment + 1], rim[segment]);
  }
}

function lumenColourAt(spec: HollowTubeSpec, lumen: Color): (distance: number) => Color {
  const fade = spec.lumenFade;
  if (!fade) return () => lumen;
  const start = new Color(fade.colour);
  return (distance) => {
    const share = Math.min(Math.max((distance - fade.fromMm) / (fade.toMm - fade.fromMm), 0), 1);
    return start.clone().lerp(lumen, share * share * (3 - 2 * share));
  };
}

export function hollowTube(spec: HollowTubeSpec): BufferGeometry {
  const builder = new MeshBuilder();
  const wall = new Color(spec.wallColour);
  const lumen = new Color(spec.lumenColour);
  const all = rings(spec);
  surfaceRows(builder, all, spec, () => wall, false);
  surfaceRows(builder, all, spec, lumenColourAt(spec, lumen), true);
  const first = all[0];
  const last = all[all.length - 1];
  annulus(builder, first, spec, spec.lumenFade ? new Color(spec.lumenFade.colour) : wall, -1);
  annulus(builder, last, spec, wall, 1);
  if (spec.plugs.start) plug(builder, first, spec, lumen, -1);
  if (spec.plugs.end) plug(builder, last, spec, lumen, 1);
  return builder.build();
}
