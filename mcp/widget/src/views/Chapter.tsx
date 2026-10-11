import { useEffect, useRef, useState } from 'preact/hooks';
import { pad2 } from '../state.ts';
import { useStrings } from '../i18n/context.ts';
import type { Strings } from '../i18n/strings.ts';
import { Icon } from './icons.tsx';
import { RichText } from './RichText.tsx';
import type { ChapterView, ViewModel } from './types.ts';

function Pills({ vm }: { vm: ViewModel }) {
  const s = useStrings();
  const box = useRef<HTMLDivElement>(null);
  const current = vm.chapters.findIndex((c) => c.id === vm.chapter);
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>('.pill.on');
    const parent = box.current;
    if (!el || !parent) return;
    const fade = parent.clientWidth * 0.12;
    const start = el.offsetLeft - parent.offsetLeft;
    if (
      start >= parent.scrollLeft &&
      start + el.offsetWidth <= parent.scrollLeft + parent.clientWidth - fade
    )
      return;
    parent.scrollTo({ left: Math.max(0, start - 8), behavior: 'smooth' });
  }, [vm.chapter]);
  return (
    <div class="pills" ref={box} role="tablist" aria-label={s.chapters}>
      {vm.chapters.map((c, i) => (
        <button
          type="button"
          role="tab"
          key={c.id}
          aria-selected={i === current}
          class={`pill${i === current ? ' on' : i < current ? ' done' : ''}`}
          title={c.title}
          onClick={() => vm.actions.setChapter(c.id)}
        >
          <em>{pad2(c.index)}</em>
          {c.short}
        </button>
      ))}
    </div>
  );
}

function Nav({ vm }: { vm: ViewModel }) {
  const s = useStrings();
  const i = vm.chapters.findIndex((c) => c.id === vm.chapter);
  return (
    <div class="nav">
      <button
        type="button"
        class="icon-btn"
        aria-label={s.prevChapter}
        disabled={i <= 0}
        onClick={() => vm.actions.step(-1)}
      >
        <Icon.prev />
      </button>
      <button
        type="button"
        class="icon-btn"
        aria-label={s.nextChapter}
        disabled={i >= vm.chapters.length - 1}
        onClick={() => vm.actions.step(1)}
      >
        <Icon.next />
      </button>
    </div>
  );
}

export function Body({ vm, chapter, all }: { vm: ViewModel; chapter: ChapterView; all: boolean }) {
  const s = useStrings();
  if (chapter.paragraphsHtml.length === 0) {
    if (vm.status === 'loading' || vm.status === 'idle') {
      return (
        <div class="text-skeleton" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      );
    }
    return <p class="muted-note">{s.chapterOnSite}</p>;
  }
  const paras = all ? chapter.paragraphsHtml : chapter.paragraphsHtml.slice(0, 1);
  return (
    <div class={`ch-text${all ? ' all' : ''}`}>
      {paras.map((html, i) => (
        <p key={i}>
          <RichText html={html} />
        </p>
      ))}
    </div>
  );
}

const indexLabel = (s: Strings, vm: ViewModel, c: ChapterView) =>
  s.chapterIndex(pad2(c.index), pad2(vm.chapters.length)).toUpperCase();

export function ChapterSection({ vm }: { vm: ViewModel }) {
  const s = useStrings();
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [vm.chapter, vm.slug]);
  const chapter = vm.chapters.find((c) => c.id === vm.chapter) ?? vm.chapters[0];
  if (!chapter) return null;
  const more = chapter.paragraphsHtml.length > 1 || (chapter.paragraphsHtml[0]?.length ?? 0) > 220;
  const pending =
    chapter.paragraphsHtml.length === 0 && (vm.status === 'loading' || vm.status === 'idle');
  return (
    <section class="a-chapter inline-only" aria-label={chapter.title}>
      <div class="top">
        <div class="index">{indexLabel(s, vm, chapter)}</div>
        <Nav vm={vm} />
      </div>
      <h3>{chapter.title}</h3>
      <Body vm={vm} chapter={chapter} all={expanded} />
      {pending && (
        <div aria-hidden="true">
          <button type="button" class="more-link is-placeholder" tabIndex={-1} disabled>
            {s.readMore}
          </button>
        </div>
      )}
      {more && (
        <div>
          <button
            type="button"
            class="more-link"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? s.readLess : s.readMore}
          </button>
        </div>
      )}
      <Pills vm={vm} />
    </section>
  );
}
