import type { PixelResponse } from './geometry/site/pixels.worker';
import { SITE_TEXTURE_IDS } from './geometry/site/siteTextures';
import type { SitePixels } from './geometry/site/siteTextures';

const WORKER_TIMEOUT_MS = 10_000;

export function openPixelWorker(): Worker | null {
  try {
    return new Worker(new URL('./geometry/site/pixels.worker.ts', import.meta.url), {
      type: 'module',
    });
  } catch {
    return null;
  }
}

export function paintInWorker(
  pixels: Partial<SitePixels>,
  open: () => Worker | null = openPixelWorker,
): Promise<void> {
  return new Promise((resolve) => {
    const worker = open();
    if (!worker) return resolve();
    const finish = () => {
      clearTimeout(timer);
      worker.terminate();
      resolve();
    };
    const timer = setTimeout(finish, WORKER_TIMEOUT_MS);
    worker.onerror = finish;
    worker.onmessage = (event: MessageEvent<PixelResponse>) => {
      pixels[event.data.id] = event.data.pixels;
      if (SITE_TEXTURE_IDS.every((id) => pixels[id])) finish();
    };
    worker.postMessage(SITE_TEXTURE_IDS);
  });
}
