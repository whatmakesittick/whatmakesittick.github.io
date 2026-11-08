import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS } from '../../ids';
import { CloseLook, isCloseView } from './closeLook';

const SETTLED = 2;

describe('close look', () => {
  it('belongs to the action and escapement views only', () => {
    expect(CAMERA_VIEW_IDS.filter(isCloseView)).toEqual(['action', 'escapement']);
  });

  it('starts in the normal look until a close view is framed', () => {
    const look = new CloseLook();
    look.step(SETTLED);
    expect(look.value).toBe(0);
    look.focus('action');
    expect(look.step(SETTLED)).toBe(true);
    expect(look.value).toBe(1);
  });

  it('fades back to the normal look for the other views', () => {
    const look = new CloseLook();
    look.focus('escapement');
    look.step(SETTLED);
    expect(look.value).toBe(1);
    look.focus('dampers');
    look.step(SETTLED);
    expect(look.value).toBe(0);
  });
});
