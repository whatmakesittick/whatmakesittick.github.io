import { useEffect, useRef } from 'preact/hooks';
import { pad2 } from '../state.ts';
import { S } from '../strings.ts';
import { Body } from './Chapter.tsx';
import { DrawerButton } from './Explore.tsx';
import { Icon } from './icons.tsx';
import { Brand } from './Brand.tsx';
import type { ViewModel } from './types.ts';

export function ProseColumn({ vm }: { vm: ViewModel }) {
  const column = useRef<HTMLElement>(null);
  const shown = useRef('');
  useEffect(() => {
    const box = column.current;
    const key = `${vm.slug}:${vm.fullscreen}`;
    const changedChapter = shown.current === key && vm.chapter !== '';
    shown.current = vm.chapter === '' ? '' : key;
    if (!box || !vm.fullscreen) return;
    if (!changedChapter) return box.scrollTo({ top: 0 });
    const active = box.querySelector<HTMLElement>('.chapter.is-active');
    if (!active) return;
    const bar = box.querySelector<HTMLElement>('.bar')?.offsetHeight ?? 0;
    const top = active.offsetTop - bar;
    if (top < box.scrollTop || top > box.scrollTop + box.clientHeight * 0.5)
      box.scrollTo({ top, behavior: 'smooth' });
  }, [vm.chapter, vm.slug, vm.fullscreen]);
  return (
    <aside class="prose fs-only" ref={column}>
      <div class="bar">
        <Brand onOpen={vm.actions.openCatalogue} />
        <div class="bar-actions">
          <DrawerButton vm={vm} />
          <button
            type="button"
            class="round-btn"
            aria-label={S.openOnSite}
            title={S.openOnSite}
            onClick={vm.actions.openSite}
          >
            <Icon.ext />
          </button>
          <button
            type="button"
            class="round-btn"
            aria-label={S.exitFullscreen}
            title={S.exitFullscreen}
            onClick={vm.actions.toggleFullscreen}
          >
            <Icon.collapse />
          </button>
        </div>
      </div>
      <header class="masthead">
        <p class="eyebrow">{vm.entry.eyebrow}</p>
        <h2 class="title">{vm.entry.title}</h2>
        <p class="tagline">{vm.tagline}</p>
      </header>
      <ol class="chapters" aria-label="Chapters">
        {vm.chapters.map((c) => {
          const on = c.id === vm.chapter;
          return (
            <li key={c.id} class={`chapter${on ? ' is-active' : ''}`}>
              <button
                type="button"
                class="chapter-head"
                aria-current={on ? 'step' : undefined}
                onClick={() => vm.actions.setChapter(c.id)}
              >
                <span class="chapter-index">{pad2(c.index)}</span>
                <span class="chapter-title">{c.title}</span>
              </button>
              {on && <Body vm={vm} chapter={c} all />}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
