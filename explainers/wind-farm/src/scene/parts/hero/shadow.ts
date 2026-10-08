import { DoubleSide, LessDepth, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { TURBINE_GEOMETRY } from '../../../model/layout';
import { SUN_DIRECTION } from '../../constants';
import { FINISHES } from '../../finishes';
import { namedGroup, registeredMaterial, registeredMesh } from '../context';
import type { PartContext } from '../context';

const LIFT = 0.05;
const BLOBS = [
  { x: 0, z: 0, size: 18, opacity: 0.5 },
  {
    x: TURBINE_GEOMETRY.transformer.centre[0],
    z: TURBINE_GEOMETRY.transformer.centre[2],
    size: 7,
    opacity: 0.4,
  },
] as const;
const BLOB_LIFT = 0.08;

export interface ShadowCaster {
  readonly geometry: BufferGeometry;
  readonly source: Object3D;
}

export interface HeroShadow {
  update(): void;
}

function projection(): Matrix4 {
  const [x, y, z] = SUN_DIRECTION;
  const run = -x / y;
  const drift = -z / y;
  return new Matrix4().set(
    1,
    run,
    0,
    -LIFT * run,
    0,
    0,
    0,
    LIFT,
    0,
    drift,
    1,
    -LIFT * drift,
    0,
    0,
    0,
    1,
  );
}

function relativeMatrix(source: Object3D, root: Object3D, target: Matrix4): Matrix4 {
  target.copy(source.matrix);
  for (let parent = source.parent; parent && parent !== root; parent = parent.parent) {
    target.premultiply(parent.matrix);
  }
  return target;
}

function silhouetteMaterial(context: PartContext): MeshBasicMaterial {
  return registeredMaterial(
    context,
    UNDIMMED_GROUP,
    new MeshBasicMaterial({
      color: FINISHES.shadow.color,
      transparent: true,
      opacity: FINISHES.shadow.opacity,
      depthWrite: true,
      depthFunc: LessDepth,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
      side: DoubleSide,
    }),
  );
}

function buildBlobs(context: PartContext, parent: Object3D): void {
  const plane = new PlaneGeometry(1, 1);
  plane.rotateX(-Math.PI / 2);
  BLOBS.forEach((blob) => {
    const material = new MeshBasicMaterial({
      map: context.textures.shadow,
      transparent: true,
      opacity: blob.opacity,
      depthWrite: false,
    });
    const mesh = registeredMesh(context, plane, UNDIMMED_GROUP, material);
    mesh.position.set(blob.x, BLOB_LIFT, blob.z);
    mesh.scale.setScalar(blob.size);
    parent.add(mesh);
  });
}

export function buildShadow(
  context: PartContext,
  root: Object3D,
  casters: readonly ShadowCaster[],
): HeroShadow {
  const group = namedGroup('heroShadow', root);
  const material = silhouetteMaterial(context);
  const project = projection();
  const scratch = new Matrix4();
  const meshes = casters.map((caster) => {
    const mesh = new Mesh(caster.geometry, material);
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
    return mesh;
  });
  buildBlobs(context, group);
  return {
    update() {
      meshes.forEach((mesh, index) => {
        relativeMatrix(casters[index].source, root, scratch);
        mesh.matrix.multiplyMatrices(project, scratch);
        mesh.matrixWorldNeedsUpdate = true;
      });
    },
  };
}
