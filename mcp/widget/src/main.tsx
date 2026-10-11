import { App } from '@modelcontextprotocol/ext-apps';
import { render } from 'preact';
import bakedCatalogue from 'virtual:wmit-catalogue';
import type { BakedCatalogue } from '../../shared/catalogue.ts';
import { createAppHost } from './bridge.ts';
import { readAssetBase } from './assetBase.ts';
import { readReportFlag } from './hostReport.ts';
import { hasWebGL2, urlLoader } from './scene.ts';
import './styles.css';
import { Widget } from './Widget.tsx';

const catalogue = bakedCatalogue as BakedCatalogue;

const assetBase = readAssetBase();

const app = new App(
  { name: 'wmit-explainer', version: '0.1.0' },
  { availableDisplayModes: ['inline', 'fullscreen'] },
  { autoResize: true },
);
const host = createAppHost(app, { reportToServer: readReportFlag() });
const root = document.getElementById('root');
if (root) {
  render(
    <Widget
      host={host}
      loader={urlLoader(assetBase ?? '')}
      assetBase={assetBase ?? ''}
      catalogue={catalogue}
      webgl={hasWebGL2}
    />,
    root,
  );
}
app
  .connect()
  .then(() => host.syncContext?.())
  .catch((error: unknown) => console.error('[wmit-widget] connect failed', error));
