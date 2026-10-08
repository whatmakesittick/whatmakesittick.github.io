import { BufferAttribute, BufferGeometry, Color } from 'three';
import { TURBINE_LAND } from '../../../model/layout';
import { TURBINE_GROUND } from './constants';
import { RGBA, writeColour } from './groundColour';
import { turbineGroundAlpha, turbineGroundColour, turbineLandHeight } from './turbineGround';

const XYZ = 3;
const FULL_TURN = Math.PI * 2;

export function ringRadii(): number[] {
  const { firstRingStep, segments } = TURBINE_GROUND;
  const growth = FULL_TURN / segments;
  const radii = [0];
  while (radii[radii.length - 1] < TURBINE_LAND.radius) {
    const last = radii[radii.length - 1];
    radii.push(last + firstRingStep + growth * last);
  }
  const scale = TURBINE_LAND.radius / radii[radii.length - 1];
  return radii.map((radius) => radius * scale);
}

function ringIndices(rings: number, segments: number): number[] {
  const indices: number[] = [];
  const at = (ring: number, step: number) => 1 + (ring - 1) * segments + (step % segments);
  for (let step = 0; step < segments; step += 1) {
    indices.push(0, at(1, step + 1), at(1, step));
    for (let ring = 1; ring < rings; ring += 1) {
      const [a, b, c, d] = [
        at(ring, step),
        at(ring, step + 1),
        at(ring + 1, step),
        at(ring + 1, step + 1),
      ];
      indices.push(a, b, c, b, d, c);
    }
  }
  return indices;
}

export function turbineTerrainGeometry(): BufferGeometry {
  const { segments } = TURBINE_GROUND;
  const radii = ringRadii();
  const rings = radii.length - 1;
  const count = 1 + rings * segments;
  const positions = new Float32Array(count * XYZ);
  const colours = new Float32Array(count * RGBA);
  const colour = new Color();
  const write = (index: number, x: number, z: number, spacing: number) => {
    positions.set([x, turbineLandHeight(x, z), z], index * XYZ);
    writeColour(
      colours,
      index,
      turbineGroundColour(x, z, spacing, colour),
      turbineGroundAlpha(x, z),
    );
  };
  write(0, 0, 0, radii[1]);
  for (let ring = 1; ring <= rings; ring += 1) {
    const radius = radii[ring];
    const spacing = Math.max(radius - radii[ring - 1], (radius * FULL_TURN) / segments);
    for (let step = 0; step < segments; step += 1) {
      const angle = (step / segments) * FULL_TURN;
      write(
        1 + (ring - 1) * segments + step,
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        spacing,
      );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, XYZ));
  geometry.setAttribute('color', new BufferAttribute(colours, RGBA));
  geometry.setIndex(ringIndices(rings, segments));
  geometry.computeVertexNormals();
  return geometry;
}
