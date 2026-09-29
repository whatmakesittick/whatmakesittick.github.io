import { BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const XYZ = 3;

export interface InducerSpec {
  top: number;
  bottom: number;
  hub: number;
  tip: number;
  blades: number;
  twist: number;
  thickness: number;
}

export interface VaneSpec {
  top: number;
  bottom: number;
  hub: number;
  tip: number;
  count: number;
  sweep: number;
  thickness: number;
}

export interface BladeRowSpec {
  top: number;
  bottom: number;
  disc: number;
  tip: number;
  count: number;
  pitch: number;
  thickness: number;
}

export function merged(parts: BufferGeometry[]): BufferGeometry {
  const prepared = parts.map((part) => {
    const flat = part.index ? part.toNonIndexed() : part.clone();
    flat.deleteAttribute('uv');
    return flat;
  });
  const result = mergeGeometries(prepared);
  parts.forEach((part) => part.dispose());
  prepared.forEach((part) => part.dispose());
  if (!result) throw new Error('Cannot merge rotor parts');
  return result;
}

export function helixBlade(spec: InducerSpec, offset: number, steps: number): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const share = step / steps;
    const angle = offset + spec.twist * share;
    const y = spec.top + (spec.bottom - spec.top) * share;
    for (const radius of [spec.hub, spec.tip]) {
      positions.push(radius * Math.sin(angle), y, radius * Math.cos(angle));
    }
  }
  for (let step = 0; step < steps; step += 1) {
    const a = step * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function inducer(spec: InducerSpec, steps: number): BufferGeometry {
  const blades = Array.from({ length: spec.blades }, (_, index) =>
    helixBlade(spec, (index / spec.blades) * Math.PI * 2, steps),
  );
  const hub = new CylinderGeometry(spec.hub, spec.hub * 0.8, spec.top - spec.bottom, 16);
  hub.translate(0, (spec.top + spec.bottom) / 2, 0);
  return merged([...blades, hub]);
}

function radialBox(
  inner: number,
  outer: number,
  height: number,
  thickness: number,
  y: number,
  angle: number,
  tilt: number,
): BufferGeometry {
  const box = new BoxGeometry(outer - inner, height, thickness);
  box.rotateX(tilt);
  box.translate((inner + outer) / 2, y, 0);
  box.rotateY(angle);
  return box;
}

export function impeller(spec: VaneSpec): BufferGeometry {
  const height = spec.top - spec.bottom;
  const vanes = Array.from({ length: spec.count }, (_, index) => {
    const angle = (index / spec.count) * Math.PI * 2;
    return radialBox(
      spec.hub,
      spec.tip,
      height * 0.7,
      spec.thickness,
      spec.bottom + height * 0.45,
      angle,
      0,
    );
  });
  const splitters = Array.from({ length: spec.count }, (_, index) => {
    const angle = ((index + 0.5) / spec.count) * Math.PI * 2 + spec.sweep;
    return radialBox(
      (spec.hub + spec.tip) / 2,
      spec.tip,
      height * 0.4,
      spec.thickness,
      spec.bottom + height * 0.3,
      angle,
      0,
    );
  });
  const hub = new CylinderGeometry(spec.hub, spec.tip, height * 0.35, 32);
  hub.translate(0, spec.bottom + height * 0.18, 0);
  const shroud = new CylinderGeometry(spec.tip, spec.tip, height * 0.12, 40);
  shroud.translate(0, spec.bottom + height * 0.06, 0);
  return merged([...vanes, ...splitters, hub, shroud]);
}

export function bladeRow(spec: BladeRowSpec): BufferGeometry {
  const height = spec.top - spec.bottom;
  const y = (spec.top + spec.bottom) / 2;
  const blades = Array.from({ length: spec.count }, (_, index) =>
    radialBox(
      spec.disc - 0.4,
      spec.tip,
      height,
      spec.thickness,
      y,
      (index / spec.count) * Math.PI * 2,
      spec.pitch,
    ),
  );
  const disc = new CylinderGeometry(spec.disc, spec.disc, height * 0.7, 40);
  disc.translate(0, y, 0);
  return merged([...blades, disc]);
}
