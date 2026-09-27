import { describe, expect, it, vi } from 'vitest';
import { Listeners } from './listeners';

describe('Listeners', () => {
  it('calls every listener in the order they were added', () => {
    const listeners = new Listeners<[number]>();
    const calls: string[] = [];
    listeners.add((value) => calls.push(`first ${value}`));
    listeners.add((value) => calls.push(`second ${value}`));
    listeners.notify(1);
    expect(calls).toEqual(['first 1', 'second 1']);
  });

  it('stops calling a listener once its remover runs', () => {
    const listeners = new Listeners<[number]>();
    const kept = vi.fn();
    const removed = vi.fn();
    listeners.add(kept);
    const remove = listeners.add(removed);
    remove();
    remove();
    listeners.notify(2);
    expect(removed).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledWith(2);
  });

  it('keeps notifying the rest when a listener removes itself', () => {
    const listeners = new Listeners<[]>();
    const later = vi.fn();
    const remove = listeners.add(() => remove());
    listeners.add(later);
    listeners.notify();
    listeners.notify();
    expect(later).toHaveBeenCalledTimes(2);
  });

  it('drops every listener on clear', () => {
    const listeners = new Listeners<[]>();
    const listener = vi.fn();
    listeners.add(listener);
    listeners.clear();
    listeners.notify();
    expect(listener).not.toHaveBeenCalled();
  });
});
