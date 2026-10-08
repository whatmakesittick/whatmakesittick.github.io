import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

type Triangle = readonly [Vector3, Vector3, Vector3];

const CORNERS = 3;
const XYZ = 3;

function triangles(geometry: BufferGeometry): Triangle[] {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = flat.getAttribute('position');
  const corner = (index: number) => new Vector3().fromBufferAttribute(position, index);
  const result = Array.from({ length: position.count / CORNERS }, (_, face): Triangle => [
    corner(face * CORNERS),
    corner(face * CORNERS + 1),
    corner(face * CORNERS + 2),
  ]);
  if (flat !== geometry) flat.dispose();
  return result;
}

function longestEdge(faces: readonly Triangle[]): number {
  return faces.reduce(
    (longest, [a, b, c]) => Math.max(longest, a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)),
    0,
  );
}

function split([a, b, c]: Triangle): Triangle[] {
  const ab = a.clone().lerp(b, 0.5);
  const bc = b.clone().lerp(c, 0.5);
  const ca = c.clone().lerp(a, 0.5);
  return [
    [a, ab, ca],
    [ab, b, bc],
    [ca, bc, c],
    [ab, bc, ca],
  ];
}

export function subdivide(geometry: BufferGeometry, maxEdge: number): BufferGeometry {
  let faces = triangles(geometry);
  const levels = Math.max(0, Math.ceil(Math.log2(longestEdge(faces) / maxEdge)));
  for (let level = 0; level < levels; level += 1) faces = faces.flatMap(split);
  const positions = new Float32Array(faces.length * CORNERS * XYZ);
  faces.forEach((face, index) =>
    face.forEach((point, corner) => point.toArray(positions, (index * CORNERS + corner) * XYZ)),
  );
  const result = new BufferGeometry();
  result.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  result.computeVertexNormals();
  return result;
}
