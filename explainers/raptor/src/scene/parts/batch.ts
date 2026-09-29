import { InstancedMesh, Matrix4, Mesh } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DYNAMIC } from './context';
import type { CutawayRole, CutawaySwitch } from './context';

interface Batch {
  material: Material;
  role: CutawayRole;
  renderOrder: number;
  meshes: Mesh[];
}

function isBatchable(object: Object3D): object is Mesh {
  if (!(object instanceof Mesh) || object instanceof InstancedMesh) return false;
  const material = object.material;
  return !Array.isArray(material) && !('isShaderMaterial' in material && material.isShaderMaterial);
}

function signature(geometry: BufferGeometry): string {
  const names = Object.keys(geometry.attributes).sort().join(',');
  return `${names}|${geometry.index ? 'indexed' : 'flat'}|${geometry.morphAttributes.position ? 'morph' : ''}`;
}

function collect(root: Object3D, cutaway: CutawaySwitch): Map<string, Batch> {
  const batches = new Map<string, Batch>();
  const visit = (object: Object3D, role: CutawayRole) => {
    if (object.userData[DYNAMIC]) return;
    const own = cutaway.roleOf(object);
    const effective = own === 'always' ? role : own;
    if (isBatchable(object) && object.children.length === 0) {
      const material = object.material as Material;
      const key = `${material.uuid}|${effective}|${object.renderOrder}|${signature(object.geometry)}`;
      let batch = batches.get(key);
      if (!batch) {
        batch = { material, role: effective, renderOrder: object.renderOrder, meshes: [] };
        batches.set(key, batch);
      }
      batch.meshes.push(object);
      return;
    }
    object.children.forEach((child) => visit(child, effective));
  };
  root.children.forEach((child) => visit(child, 'always'));
  return batches;
}

export function batchStatic(root: Object3D, cutaway: CutawaySwitch): BufferGeometry[] {
  root.updateMatrixWorld(true);
  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  const relative = new Matrix4();
  const created: BufferGeometry[] = [];
  for (const batch of collect(root, cutaway).values()) {
    if (batch.meshes.length < 2) continue;
    const parts = batch.meshes.map((mesh) =>
      mesh.geometry.clone().applyMatrix4(relative.multiplyMatrices(toRoot, mesh.matrixWorld)),
    );
    const merged = mergeGeometries(parts);
    parts.forEach((part) => part.dispose());
    if (!merged) continue;
    const mesh = new Mesh(merged, batch.material);
    mesh.renderOrder = batch.renderOrder;
    cutaway.forget(batch.meshes);
    batch.meshes.forEach((old) => {
      old.removeFromParent();
      old.geometry.dispose();
    });
    root.add(cutaway.adopt(mesh, batch.role));
    created.push(merged);
  }
  return created;
}
