import { useEffect, useRef } from 'preact/hooks';
import type { EmbedInfo } from '../../../src/core/embed/contract.ts';
import type { Actions, Discrete } from './views/types.ts';

export function useKeyboard(
  actions: Actions,
  info: EmbedInfo | undefined,
  disc: Discrete,
  ready: boolean,
): void {
  const latest = useRef({ actions, info, disc, ready });
  latest.current = { actions, info, disc, ready };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const { actions: a, info: i, disc: d, ready: r } = latest.current;
      const onButton = el?.tagName === 'BUTTON';
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        a.step(e.key === 'ArrowLeft' ? -1 : 1);
        e.preventDefault();
        return;
      }
      if (!r || !i) return;
      if (e.key === ' ' && !onButton) {
        a.togglePlay();
        e.preventDefault();
        return;
      }
      const key = e.key.toUpperCase();
      if (key.length !== 1) return;
      const toggle = i.toggles.find((t) => t.shortcut.toUpperCase() === key);
      if (toggle) {
        a.setView(toggle.id, !d.view[toggle.id]);
        return;
      }
      const choice = i.choices.find((c) => c.shortcut?.toUpperCase() === key);
      if (choice && choice.options.length > 0) {
        const at = choice.options.findIndex((o) => o.value === d.choices[choice.id]);
        const next = choice.options[(at + 1) % choice.options.length];
        if (next) a.setChoice(choice.id, next.value);
        return;
      }
      if (key === 'R') a.resetCamera();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
