import favicon from '../../../../public/favicon.svg?raw';
import siteLink from '../../../../src/core/partials/site-link.html?raw';
import { SITE_ORIGIN } from '../../../shared/catalogue.ts';
import { useStrings } from '../i18n/context.ts';

export const SITE_HOME = `${SITE_ORIGIN}/`;

const icon = favicon
  .replace(/<title>[^<]*<\/title>\s*/, '')
  .replace('<svg ', '<svg class="site-link-icon" width="22" height="22" aria-hidden="true" ')
  .trim();

const markups = new Map<string, string>();

function markup(siteName: string): string {
  let html = markups.get(siteName);
  if (html === undefined) {
    html = siteLink
      .replace('{{catalogueUrl}}', SITE_HOME)
      .replace('{{siteName}}', () => siteName)
      .replace(/<img class="site-link-icon"[^>]*\/>/, icon)
      .trim();
    markups.set(siteName, html);
  }
  return html;
}

export function Brand({ onOpen }: { onOpen: () => void }) {
  const s = useStrings();
  return (
    <span
      class="brand"
      onClick={(event) => {
        if (!(event.target as Element).closest('a')) return;
        event.preventDefault();
        onOpen();
      }}
      dangerouslySetInnerHTML={{ __html: markup(s.brand) }}
    />
  );
}
