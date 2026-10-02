import { BufferAttribute } from 'three';
import type { BufferGeometry } from 'three';
import { lerp, smoothstep } from '@core/math';

export interface UndersideShade {
  top: number;
  bottom: number;
  from: number;
  to: number;
}

const RGB = 3;

export function shadeUnderside<T extends BufferGeometry>(geometry: T, shade: UndersideShade): T {
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
  const normal = geometry.getAttribute('normal');
  const colours = new Float32Array(normal.count * RGB);
  for (let index = 0; index < normal.count; index += 1) {
    const level = lerp(
      shade.bottom,
      shade.top,
      smoothstep(normal.getY(index), shade.from, shade.to),
    );
    colours.fill(level, index * RGB, index * RGB + RGB);
  }
  geometry.setAttribute('color', new BufferAttribute(colours, RGB));
  return geometry;
}
