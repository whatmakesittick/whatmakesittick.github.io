import { App } from '@modelcontextprotocol/ext-apps';
import { render } from 'preact';
import bakedCatalogue from 'virtual:wmit-catalogue';
import type { BakedCatalogue } from '../../shared/catalogue.ts';
import type { WidgetStartOptions } from '../../shared/loader.ts';
import { createAppHost } from './bridge.ts';
import { readReportFlag } from './hostReport.ts';
import { InboxTransport } from './inbox.ts';
import { hasWebGL2, urlLoader } from './scene.ts';
import styles from './styles.css?inline';
import { Widget } from './Widget.tsx';

const catalogue = bakedCatalogue as BakedCatalogue;
const STYLE_ATTRIBUTE = 'data-wmit-widget';

function addStyles(doc: Document): void {
  if (doc.head.querySelector(`style[${STYLE_ATTRIBUTE}]`)) return;
  const style = doc.createElement('style');
  style.setAttribute(STYLE_ATTRIBUTE, '');
  style.textContent = styles;
  doc.head.append(style);
}

export function start(root: HTMLElement, { assetBase, inbox }: WidgetStartOptions): void {
  addStyles(root.ownerDocument);
  const app = new App(
    { name: 'wmit-explainer', version: '0.1.0' },
    { availableDisplayModes: ['inline', 'fullscreen'] },
    { autoResize: true },
  );
  const host = createAppHost(app, { reportToServer: readReportFlag(root.ownerDocument) });
  render(
    <Widget
      host={host}
      loader={urlLoader(assetBase)}
      assetBase={assetBase}
      catalogue={catalogue}
      webgl={hasWebGL2}
    />,
    root,
  );
  app
    .connect(new InboxTransport(inbox))
    .then(() => host.syncContext?.())
    .catch((error: unknown) => console.error('[wmit-widget] connect failed', error));
}
