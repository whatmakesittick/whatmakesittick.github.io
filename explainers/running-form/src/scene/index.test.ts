import { describe, expect, it, vi } from 'vitest';
import type { SceneShell } from '@core/scene/shell';
import { createRunStore } from '../state';
import { mountRunScene } from './index';

const { bindStore, dispose, disposeLabels } = vi.hoisted(() => ({
  bindStore: vi.fn(),
  dispose: vi.fn(),
  disposeLabels: vi.fn(),
}));

vi.mock('./bindings', () => ({ bindStore }));
vi.mock('./controller', () => ({
  RunController: class {
    update = vi.fn();
    dispose = dispose;
  },
}));
vi.mock('@core/scene/presetBinder', () => ({
  createLabelVisibility: () => ({ setWanted: vi.fn(), dispose: disposeLabels }),
}));

function fakeShell() {
  const removeFrame = vi.fn();
  const shell = { onFrame: vi.fn(() => removeFrame) } as unknown as SceneShell;
  return { shell, removeFrame };
}

describe('mountRunScene', () => {
  it('releases the frame hook, labels and controller on teardown', async () => {
    const unbind = vi.fn();
    bindStore.mockResolvedValueOnce(unbind);
    const { shell, removeFrame } = fakeShell();
    const teardown = await mountRunScene(shell, createRunStore());
    expect(removeFrame).not.toHaveBeenCalled();
    teardown();
    expect(unbind).toHaveBeenCalledTimes(1);
    expect(removeFrame).toHaveBeenCalledTimes(1);
    expect(disposeLabels).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('releases everything when binding the store fails', async () => {
    dispose.mockClear();
    disposeLabels.mockClear();
    bindStore.mockRejectedValueOnce(new Error('build failed'));
    const { shell, removeFrame } = fakeShell();
    await expect(mountRunScene(shell, createRunStore())).rejects.toThrow('build failed');
    expect(removeFrame).toHaveBeenCalledTimes(1);
    expect(disposeLabels).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
