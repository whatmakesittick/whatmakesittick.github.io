import type { WidgetCatalogueEntry } from '../../../shared/catalogue.ts';
import { useStrings } from '../i18n/context.ts';
import { Brand } from './Brand.tsx';

function BrandRow({ onOpen }: { onOpen: () => void }) {
  return (
    <div class="row">
      <Brand onOpen={onOpen} />
    </div>
  );
}

export function Waiting({ onOpen, quiet }: { onOpen: () => void; quiet: boolean }) {
  const s = useStrings();
  return (
    <>
      <header class="a-head">
        <BrandRow onOpen={onOpen} />
        <div class="text-skeleton title-skel" aria-hidden="true">
          <i />
          <i />
        </div>
      </header>
      <div class="stage waiting">
        <div class="state state-loading">
          {!quiet && (
            <div class="center">
              <div class="box">
                <h5>{s.loading.title}</h5>
                <p>{s.loading.body}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function Unknown({
  catalogue,
  assetBase,
  onPick,
  onOpen,
}: {
  catalogue: WidgetCatalogueEntry[];
  assetBase: string;
  onPick: (slug: string) => void;
  onOpen: () => void;
}) {
  const s = useStrings();
  return (
    <>
      <header class="a-head">
        <BrandRow onOpen={onOpen} />
        <h2 class="title">{s.unknown}</h2>
      </header>
      <section class="a-explore unknown">
        <div class="grid">
          {catalogue.map((e) => (
            <button
              type="button"
              class="thumb"
              key={e.slug}
              data-slug={e.slug}
              onClick={() => onPick(e.slug)}
            >
              <img src={`${assetBase}${e.cover}`} alt="" loading="lazy" width={932} height={699} />
              <span class="t">
                <span class="e">{e.eyebrow}</span>
                {e.title}
              </span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
