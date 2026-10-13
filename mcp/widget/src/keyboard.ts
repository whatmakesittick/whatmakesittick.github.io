import { useEffect, useRef } from 'preact/hooks';
import type { EmbedInfo } from '../../../src/core/embed/contract.ts';
import { stageShortcuts, type ExpandableStage } from '../../../src/core/ui/stageShortcuts.ts';
import type { Actions, Discrete } from './views/types.ts';

export function useKeyboard(
  actions: Actions,
  info: EmbedInfo | undefined,
  disc: Discrete,
  ready: boolean,
  stage?: ExpandableStage,
): void {
  const latest = useRef({ actions, info, disc, ready, stage });
  latest.current = { actions, info, disc, ready, stage };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const { actions: a, info: i, disc: d, ready: r, stage: st } = latest.current;
      const onButton = el?.tagName === 'BUTTON';
      if (st && stageShortcuts(st)[e.key.toLowerCase()]?.()) {
        e.preventDefault();
        return;
      }
      if (!r || !i) return;
      if (st?.expanded) {
        a.handleKey(e);
        return;
      }
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
