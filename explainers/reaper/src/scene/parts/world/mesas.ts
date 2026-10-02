import { BufferAttribute, Color } from 'three';
import type { BufferGeometry, Mesh } from 'three';
import { smoothstep } from '@core/math';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { MESAS } from '../../constants';
import { WORLD_FINISHES } from '../../finishes';
import { mesaRings } from '../../geometry/mesa';
import { stitchRings } from '../../geometry/rings';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

const RGB = 3;
const CLIFF = new Color(MESAS.colours.cliff);
const TALUS = new Color(MESAS.colours.talus);
const CAP = new Color(MESAS.colours.cap);

function paint(geometry: BufferGeometry, height: number): BufferGeometry {
  const normal = geometry.getAttribute('normal');
  const position = geometry.getAttribute('position');
  const colours = new Float32Array(normal.count * RGB);
  const tint = new Color();
  for (let index = 0; index < normal.count; index += 1) {
    const flat = smoothstep(normal.getY(index), MESAS.shade.from, MESAS.shade.to);
    const low = 1 - smoothstep(position.getY(index), 0, height * MESAS.layers[1].height);
    tint.copy(CLIFF).lerp(TALUS, low).lerp(CAP, flat);
    tint.toArray(colours, index * RGB);
  }
  geometry.setAttribute('color', new BufferAttribute(colours, RGB));
  return geometry;
}

export function createMesas(context: PartContext): Mesh {
  const rocks = MESAS.sites.map((site) =>
    paint(stitchRings(mesaRings(site), { capEnd: true }), site.height),
  );
  return partMesh(context, mergeParts(rocks), UNDIMMED_GROUP, WORLD_FINISHES.rock);
}
