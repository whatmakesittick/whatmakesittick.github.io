import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS } from '../../ids';
import { CloseLook, isCloseView } from './closeLook';

const NEAR = 1;
const FAR = 4;
const SETTLED = 2;

describe('close look', () => {
  it('belongs to the action and escapement views only', () => {
    expect(CAMERA_VIEW_IDS.filter(isCloseView)).toEqual(['action', 'escapement']);
  });

  it('starts in the normal look until a close view is framed', () => {
    const look = new CloseLook();
    look.step(SETTLED, NEAR);
    expect(look.value).toBe(0);
    look.focus('action');
    expect(look.step(SETTLED, NEAR)).toBe(true);
    expect(look.value).toBe(1);
  });

  it('fades back for the other views and when the camera pulls far away', () => {
    const look = new CloseLook();
    look.focus('escapement');
    look.step(SETTLED, NEAR);
    look.step(0, FAR);
    expect(look.value).toBe(0);
    look.step(0, NEAR);
    expect(look.value).toBe(1);
    look.focus('dampers');
    look.step(SETTLED, NEAR);
    expect(look.value).toBe(0);
  });
});
