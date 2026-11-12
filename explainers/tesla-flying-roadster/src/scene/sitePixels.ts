import { runPaced } from '@core/scene/pacing';
import type { Steps } from '@core/scene/pacing';
import { SITE_TEXTURE_IDS, paintSiteTexture } from './geometry/site/siteTextures';
import type { SitePixels } from './geometry/site/siteTextures';

export type RemotePainter = (pixels: Partial<SitePixels>) => Promise<void>;

function* paintMissing(pixels: Partial<SitePixels>): Steps<void> {
  for (const id of SITE_TEXTURE_IDS) {
    if (pixels[id]) continue;
    pixels[id] = paintSiteTexture(id);
    yield;
  }
}

export async function paintSitePixels(paintRemotely?: RemotePainter): Promise<SitePixels> {
  const pixels: Partial<SitePixels> = {};
  await paintRemotely?.(pixels);
  await runPaced(paintMissing(pixels));
  return pixels as SitePixels;
}
