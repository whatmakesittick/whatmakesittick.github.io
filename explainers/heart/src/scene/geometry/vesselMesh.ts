import { BufferAttribute, Color, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { capGeometry } from './cap';
import { nestLoops } from './contour';
import { mergeParts } from './merge';
import { TUBE_LAYER } from './tube';
import { FRONTAL_PLANE, insertPlane, planeLoops, sideFilter, subsetGeometry } from './planeCut';

export interface VesselLayers {
  readonly wall: BufferGeometry;
  readonly lumen: BufferGeometry;
}

export interface VesselHalves {
  readonly front: VesselLayers;
  readonly back: VesselLayers;
}

const XYZ = 3;
const RIM_DEPTH_MM = -0.05;
const NO_BAND = { bandMm: 0, bandShare: 0 } as const;

function rimCap(back: BufferGeometry, colour: Color): BufferGeometry | null {
  const positions = back.getAttribute('position').array;
  const loops = planeLoops(back, FRONTAL_PLANE);
  if (loops.length === 0) return null;
  const outlines = loops.map((loop) =>
    loop.map((vertex) => new Vector2(positions[vertex * XYZ], positions[vertex * XYZ + 1])),
  );
  const { outers, holes } = nestLoops(outlines);
  const { geometry } = capGeometry(outers, holes, NO_BAND);
  const count = geometry.getAttribute('position').count;
  const rimColours = new Float32Array(count * XYZ);
  const cap = geometry.getAttribute('position').array as Float32Array;
  for (let vertex = 0; vertex < count; vertex += 1) {
    cap[vertex * XYZ + 2] = RIM_DEPTH_MM;
    colour.toArray(rimColours, vertex * XYZ);
  }
  geometry.setAttribute('color', new BufferAttribute(rimColours, XYZ));
  geometry.setAttribute(
    'layer',
    new BufferAttribute(new Float32Array(count).fill(TUBE_LAYER.wall), 1),
  );
  return geometry;
}

function byLayer(geometry: BufferGeometry, layer: number): BufferGeometry {
  const layers = geometry.getAttribute('layer').array;
  const subset = subsetGeometry(geometry, (corners) => layers[corners[0]] === layer);
  subset.deleteAttribute('layer');
  return subset;
}

function layered(geometry: BufferGeometry): VesselLayers {
  const layers = {
    wall: byLayer(geometry, TUBE_LAYER.wall),
    lumen: byLayer(geometry, TUBE_LAYER.lumen),
  };
  geometry.dispose();
  return layers;
}

export function vesselHalves(geometry: BufferGeometry, rimColour: string): VesselHalves {
  const cut = insertPlane(geometry, FRONTAL_PLANE);
  const front = subsetGeometry(cut, sideFilter(cut, FRONTAL_PLANE, true));
  const backSurface = subsetGeometry(cut, sideFilter(cut, FRONTAL_PLANE, false));
  cut.dispose();
  const rim = rimCap(backSurface, new Color(rimColour));
  const back = rim ? mergeParts([backSurface, rim]) : backSurface;
  return { front: layered(front), back: layered(back) };
}
