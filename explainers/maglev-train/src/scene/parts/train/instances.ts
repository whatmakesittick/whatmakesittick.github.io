import { Matrix4 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { instancesOf } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { isAhead } from './layout';

export type ShowAhead = (shown: boolean) => void;

export function cutInstances(
  context: PartContext,
  parent: Object3D,
  geometry: BufferGeometry,
  group: EmphasisGroup,
  finish: MaterialFinish,
  slots: readonly number[],
): ShowAhead {
  const sorted = [...slots].sort((a, b) => a - b);
  const matrices = sorted.map((x) => new Matrix4().makeTranslation(x, 0, 0));
  const mesh = instancesOf(context, geometry, context.materials.get(group, finish), matrices);
  mesh.name = group;
  parent.add(mesh);
  const behind = sorted.filter((x) => !isAhead(x)).length;
  return (shown) => {
    mesh.count = shown ? sorted.length : behind;
  };
}

export function allAhead(toggles: readonly ShowAhead[]): ShowAhead {
  return (shown) => toggles.forEach((toggle) => toggle(shown));
}
