import { paintSiteTexture } from './siteTextures';
import type { SiteTextureId } from './siteTextures';

export interface PixelResponse {
  id: SiteTextureId;
  pixels: Uint8Array;
}

const scope = self as unknown as Pick<Worker, 'postMessage'>;

self.onmessage = (event: MessageEvent<readonly SiteTextureId[]>) => {
  event.data.forEach((id) => {
    const pixels = paintSiteTexture(id);
    const response: PixelResponse = { id, pixels };
    scope.postMessage(response, [pixels.buffer]);
  });
};
