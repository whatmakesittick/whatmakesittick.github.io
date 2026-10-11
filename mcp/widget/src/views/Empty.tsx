import type { WidgetCatalogueEntry } from '../../../shared/catalogue.ts';
import { S } from '../strings.ts';
import { Icon } from './icons.tsx';

function BrandRow() {
  return (
    <div class="row">
      <span class="brand">
        <Icon.brand />
        {S.brand}
      </span>
    </div>
  );
}

export function Waiting() {
  return (
    <>
      <header class="a-head">
        <BrandRow />
        <div class="text-skeleton title-skel" aria-hidden="true">
          <i />
          <i />
        </div>
      </header>
      <div class="stage waiting">
        <div class="state state-loading">
          <div class="center">
            <div class="box">
              <h5>{S.loading.title}</h5>
              <p>{S.loading.body}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function Unknown({
  catalogue,
  assetBase,
  onPick,
}: {
  catalogue: WidgetCatalogueEntry[];
  assetBase: string;
  onPick: (slug: string) => void;
}) {
  return (
    <>
      <header class="a-head">
        <BrandRow />
        <h2 class="title">{S.unknown}</h2>
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
