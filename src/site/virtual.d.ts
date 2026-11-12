declare module 'virtual:explainer-catalogue' {
  import type { CardMetaLoader, CatalogueCard } from './catalogue';

  export const entries: CatalogueCard[];
  export const metaLoader: CardMetaLoader;
}

declare module 'virtual:explainer-catalogue/*' {
  import type { CardMetaMap } from './catalogue';

  const metas: CardMetaMap;
  export default metas;
}
