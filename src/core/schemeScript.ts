import { THEME_COLOR, preferredScheme } from './scheme.ts';

const { scheme, stored } = preferredScheme({
  storage: () => localStorage,
  matchMedia: (query) => matchMedia(query),
});
document.documentElement.dataset.theme = scheme;
if (stored) {
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = THEME_COLOR[scheme];
  });
}
