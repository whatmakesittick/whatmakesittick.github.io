import { describe, expect, it } from 'vitest';
import { SITE_TEXTURE_IDS, paintSiteTexture } from './geometry/site/siteTextures';
import type { SiteTextureId } from './geometry/site/siteTextures';
import type { PixelResponse } from './geometry/site/pixels.worker';
import { paintInWorker } from './pixelWorker';
import { paintSitePixels } from './sitePixels';

const TEST_TIMEOUT_MS = 60_000;

const inFakeWorker =
  (failing: readonly SiteTextureId[] = []) =>
  (pixels: Parameters<typeof paintInWorker>[0]) =>
    paintInWorker(pixels, () => workerLike(failing));

function identical(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function workerLike(failing: readonly SiteTextureId[] = []): Worker {
  const worker = {
    onmessage: null as ((event: MessageEvent<PixelResponse>) => void) | null,
    onerror: null as (() => void) | null,
    terminate: () => {},
    postMessage(ids: readonly SiteTextureId[]) {
      const delivered = ids.filter((id) => !failing.includes(id));
      queueMicrotask(() => {
        delivered.forEach((id) => {
          const pixels = paintSiteTexture(id);
          const data = structuredClone({ id, pixels }, { transfer: [pixels.buffer] });
          worker.onmessage?.({ data } as MessageEvent<PixelResponse>);
        });
        if (delivered.length < ids.length) worker.onerror?.();
      });
    },
  };
  return worker as unknown as Worker;
}

describe('site pixels', { timeout: TEST_TIMEOUT_MS }, () => {
  it('returns identical pixels from the worker path and the main thread path', async () => {
    const viaWorker = await paintSitePixels(inFakeWorker());
    const onMain = await paintSitePixels();
    SITE_TEXTURE_IDS.forEach((id) => {
      expect(viaWorker[id].length).toBeGreaterThan(0);
      expect(identical(viaWorker[id], onMain[id]), id).toBe(true);
    });
  });

  it('paints the textures a failing worker could not deliver on the main thread', async () => {
    const failing: SiteTextureId[] = ['scrub', 'concrete'];
    const pixels = await paintSitePixels(inFakeWorker(failing));
    failing.forEach((id) => {
      expect(identical(pixels[id], paintSiteTexture(id)), id).toBe(true);
    });
  });

  it('paints on the main thread when no worker can be opened', async () => {
    const pixels = await paintSitePixels();
    expect(Object.keys(pixels)).toEqual(SITE_TEXTURE_IDS);
  });
});
