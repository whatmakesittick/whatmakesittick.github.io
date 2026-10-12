import type { RefObject } from 'preact';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import type { WidgetCatalogueEntry } from '../../shared/catalogue.ts';
import type { EmbedController, EmbedInfo, LanguageCode } from '../../../src/core/embed/contract.ts';
import { MODEL_CONTEXT_DEBOUNCE_MS, type ModelContextSnapshot } from '../../shared/tools.ts';
import type { WidgetHost } from './bridge.ts';
import { debounce, modelContextText, sameSnapshot, snapshotOf } from './state.ts';
import type { Discrete } from './views/types.ts';

export interface ModelContextInput {
  slug: string | undefined;
  entry: WidgetCatalogueEntry | undefined;
  chapter: string;
  disc: Discrete;
  info: EmbedInfo | undefined;
  lang: LanguageCode;
  ctrlRef: RefObject<EmbedController | undefined>;
}

export function useModelContextSync(
  host: WidgetHost,
  { slug, entry, chapter, disc, info, lang, ctrlRef }: ModelContextInput,
) {
  const userChanged = useRef(false);
  const lastSent = useRef<ModelContextSnapshot | undefined>(undefined);

  const sendContext = useMemo(
    () =>
      debounce((snap: ModelContextSnapshot, text: string) => {
        if (sameSnapshot(lastSent.current, snap)) return;
        lastSent.current = snap;
        void host
          .updateModelContext(text, snap)
          .catch((e: unknown) => console.warn('[wmit-widget] updateModelContext', e));
      }, MODEL_CONTEXT_DEBOUNCE_MS),
    [host],
  );

  useEffect(() => {
    if (!slug || !entry || !host.canUpdateModelContext()) return;
    const state = ctrlRef.current?.info.slug === slug ? ctrlRef.current.getState() : undefined;
    if (!userChanged.current) return;
    const snap = snapshotOf(slug, state, chapter);
    sendContext(snap, modelContextText(entry, ctrlRef.current?.info, snap, state, lang));
  }, [slug, chapter, disc, info, lang]);

  return userChanged;
}
