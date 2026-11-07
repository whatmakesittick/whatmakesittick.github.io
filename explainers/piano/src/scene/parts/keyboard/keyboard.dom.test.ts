import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Vector3 } from 'three';
import type { Object3D } from 'three';
import { PLAYED_KEY, SHIFT_MM, cutX, mm } from '../../../model';
import type { Frame } from '../context';
import { createKeyboard } from './keyboard';
import { stateAt, testContext } from './testState';

const FRAME: Frame = { delta: 1 / 60, elapsed: 0, cameraDistance: 1 };
const SETTLE_FRAMES = 90;
const ENTRIES_PER_KEY = 4;
const DIGITS = 6;

function hiddenCount(root: Object3D): number {
  const matrix = new Matrix4();
  const scale = new Vector3();
  let hidden = 0;
  root.traverse((node) => {
    if (!(node instanceof InstancedMesh)) return;
    for (let index = 0; index < node.count; index += 1) {
      node.getMatrixAt(index, matrix);
      if (scale.setFromMatrixScale(matrix).lengthSq() === 0) hidden += 1;
    }
  });
  return hidden;
}

function named(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name);
  if (!found) throw new Error(`missing ${name}`);
  return found;
}

describe('createKeyboard', () => {
  it('hides only the played key and brings it back when the register changes', () => {
    const section = createKeyboard(testContext());
    section.setState(stateAt(0));
    expect(hiddenCount(section.root)).toBe(ENTRIES_PER_KEY);
    section.setState(stateAt(0, { register: 'bass' }));
    expect(hiddenCount(section.root)).toBe(ENTRIES_PER_KEY);
  });

  it('slides the keys with the una corda shift and settles', () => {
    const section = createKeyboard(testContext());
    section.setState(stateAt(0));
    section.setState(stateAt(0, { pedal: 'unaCorda' }));
    expect(section.animate?.(FRAME, stateAt(0))).toBe(true);
    for (let frame = 0; frame < SETTLE_FRAMES; frame += 1) section.animate?.(FRAME, stateAt(0));
    expect(section.animate?.(FRAME, stateAt(0))).toBe(false);
    expect(named(section.root, 'keyboardShift').position.x).toBeCloseTo(mm(SHIFT_MM), DIGITS);
  });

  it('caps the keybed and key frame at the cut only with the cutaway on', () => {
    const context = testContext();
    const section = createKeyboard(context);
    section.setState(stateAt(0, { view: { cutaway: false } }));
    const cap = named(section.root, 'keyboardCap');
    expect(cap.visible).toBe(false);
    section.setState(stateAt(0, { register: 'treble' }));
    expect(cap.visible).toBe(true);
    expect(cap.position.x).toBeCloseTo(cutX(PLAYED_KEY.treble), DIGITS);
    expect(context.labels.has('keyboard')).toBe(true);
  });
});
