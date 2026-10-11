import { useEffect, useState } from 'preact/hooks';
import type { EmbedState } from '../../../src/core/embed/contract.ts';

type Listener = (s: EmbedState | undefined) => void;

export function createLive() {
  let value: EmbedState | undefined;
  let pending: EmbedState | undefined;
  let frame = 0;
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((l) => l(value));
  return {
    get: () => value,
    push(next: EmbedState) {
      pending = next;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        value = pending;
        emit();
      });
    },
    reset(next: EmbedState | undefined) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      value = next;
      emit();
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export type Live = ReturnType<typeof createLive>;

export function useLive(live: Live): EmbedState | undefined {
  const [state, set] = useState(live.get());
  useEffect(() => {
    set(live.get());
    return live.subscribe(set);
  }, [live]);
  return state;
}
