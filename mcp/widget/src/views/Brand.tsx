import favicon from '../../../../public/favicon.svg?raw';
import siteLink from '../../../../src/core/partials/site-link.html?raw';
import { SITE_ORIGIN } from '../../../shared/catalogue.ts';
import { S } from '../strings.ts';

export const SITE_HOME = `${SITE_ORIGIN}/`;

const icon = favicon
  .replace(/<title>[^<]*<\/title>\s*/, '')
  .replace('<svg ', '<svg class="site-link-icon" width="22" height="22" aria-hidden="true" ')
  .trim();

const markup = siteLink
  .replace('{{catalogueUrl}}', SITE_HOME)
  .replace('{{siteName}}', S.brand)
  .replace(/<img class="site-link-icon"[^>]*\/>/, icon)
  .trim();

export function Brand({ onOpen }: { onOpen: () => void }) {
  return (
    <span
      class="brand"
      onClick={(event) => {
        if (!(event.target as Element).closest('a')) return;
        event.preventDefault();
        onOpen();
      }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
