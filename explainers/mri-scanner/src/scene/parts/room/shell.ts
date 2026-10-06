import { Float32BufferAttribute, Mesh } from 'three';
import type { BufferGeometry, MeshStandardMaterial } from 'three';
import { createMaterial } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import type { EmphasisGroup, PartContext } from '../context';
import { mergeParts, registered } from '../context';
import type { WallSide } from './farSide';

export interface ShellPiece {
  readonly geometry: BufferGeometry;
  readonly side: WallSide;
}

const ATTRIBUTE = 'shellSide';
const PLANE_SIZE = 4;
const CACHE_KEY = 'mriRoomShell';
const VERTEX_DECLARATIONS = `attribute vec4 ${ATTRIBUTE};\nvarying float shellHidden;\nvoid main() {\n  shellHidden = step( ${ATTRIBUTE}.w, dot( cameraPosition, ${ATTRIBUTE}.xyz ) );`;
const FRAGMENT_DECLARATIONS =
  'varying float shellHidden;\nvoid main() {\n  if ( shellHidden > 0.5 ) discard;';

export const ALWAYS_SHOWN: WallSide = { normal: [0, 1, 0], offset: Number.MAX_SAFE_INTEGER };

function tagged({ geometry, side }: ShellPiece): BufferGeometry {
  const prepared = geometry.index ? geometry.toNonIndexed() : geometry;
  const plane = [...side.normal, side.offset];
  const values = new Float32Array(prepared.attributes.position.count * PLANE_SIZE);
  for (let at = 0; at < values.length; at += PLANE_SIZE) values.set(plane, at);
  prepared.setAttribute(ATTRIBUTE, new Float32BufferAttribute(values, PLANE_SIZE));
  return prepared;
}

function shellMaterial(
  context: PartContext,
  group: EmphasisGroup,
  finish: MaterialFinish,
): MeshStandardMaterial {
  const material = createMaterial(finish);
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('void main() {', VERTEX_DECLARATIONS);
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', FRAGMENT_DECLARATIONS);
  };
  material.customProgramCacheKey = () => CACHE_KEY;
  return registered(context, group, material);
}

export function shellMesh(
  context: PartContext,
  pieces: readonly ShellPiece[],
  group: EmphasisGroup,
  finish: MaterialFinish,
): Mesh {
  const geometry = mergeParts(pieces.map(tagged));
  const mesh = new Mesh(context.tracker.track(geometry), shellMaterial(context, group, finish));
  mesh.name = 'roomShell';
  mesh.raycast = () => undefined;
  return mesh;
}
