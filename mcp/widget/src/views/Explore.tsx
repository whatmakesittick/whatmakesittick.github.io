import { useEffect, useRef, useState } from 'preact/hooks';
import type { WidgetCatalogueEntry } from '../../../shared/catalogue.ts';
import { useStrings } from '../i18n/context.ts';
import { Icon } from './icons.tsx';
import { coverUrl, hideBroken, type ViewModel } from './types.ts';

function Tile({
  vm,
  entry,
  eyebrow,
  eager,
}: {
  vm: ViewModel;
  entry: WidgetCatalogueEntry;
  eyebrow?: boolean;
  eager?: boolean;
}) {
  const s = useStrings();
  const cur = entry.slug === vm.slug;
  const held = !vm.catalogue.some((e) => e.slug === entry.slug);
  return (
    <button
      type="button"
      class={`thumb${cur ? ' cur' : ''}${held ? ' held' : ''}`}
      aria-current={cur ? 'true' : undefined}
      aria-hidden={held ? 'true' : undefined}
      inert={held}
      title={entry.summary}
      data-slug={entry.slug}
      onClick={held || cur ? undefined : () => vm.actions.switchTo(entry.slug)}
    >
      {cur && <span class="badge">{s.watching}</span>}
      <img
        src={coverUrl(vm.assetBase, entry)}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        width={932}
        height={699}
        onError={hideBroken}
      />
      <span class="t">
        {eyebrow && <span class="e">{entry.eyebrow}</span>}
        {entry.title}
      </span>
    </button>
  );
}

export function ExploreStrip({ vm }: { vm: ViewModel }) {
  const s = useStrings();
  const strip = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const update = () => {
    const el = strip.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 2,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    });
  };
  useEffect(update, []);
  const by = (dir: -1 | 1) =>
    strip.current?.scrollBy({ left: dir * (strip.current.clientWidth - 60), behavior: 'smooth' });
  return (
    <section
      class="a-explore inline-only"
      onPointerEnter={vm.actions.browse}
      onFocusIn={vm.actions.browse}
    >
      <div class="top">
        <h4>
          {s.exploreMore}
          <span class="lg">{s.count(vm.catalogue.length)}</span>
          <span class="sh">{vm.catalogue.length}</span>
        </h4>
        <div class="nav">
          <button
            type="button"
            class="icon-btn"
            aria-label={s.scrollLeft}
            disabled={edges.start}
            onClick={() => by(-1)}
          >
            <Icon.prev />
          </button>
          <button
            type="button"
            class="icon-btn"
            aria-label={s.scrollRight}
            disabled={edges.end}
            onClick={() => by(1)}
          >
            <Icon.next />
          </button>
        </div>
      </div>
      <div
        class={`strip${edges.end ? ' at-end' : ''}`}
        ref={strip}
        onScroll={() => {
          update();
          vm.actions.browse();
        }}
      >
        {vm.strip.map((e, i) => (
          <Tile key={e.slug} vm={vm} entry={e} eager={i < 6} />
        ))}
      </div>
    </section>
  );
}
