import {
  EMBED_API_VERSION,
  type EmbedController,
  type EmbedModule,
  type EmbedState,
  type EmbedUiSlots,
  type LanguageCode,
} from '../../../src/core/embed/contract.ts';
import { DEFAULT_LANGUAGE } from '../../../src/core/i18n/languages.ts';

export type SceneStatus = 'idle' | 'loading' | 'ready' | 'nowebgl' | 'error';

export interface ModuleLoader {
  load(slug: string, attempt: number): Promise<EmbedModule>;
}

export function urlLoader(assetBase: string): ModuleLoader {
  return {
    load: (slug, attempt) =>
      import(
        /* @vite-ignore */ `${assetBase}${slug}.js${attempt > 0 ? `?retry=${attempt}` : ''}`
      ) as Promise<EmbedModule>,
  };
}

export function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export interface SceneCallbacks {
  status(status: SceneStatus, progress: number, error?: unknown): void;
  controller(controller: EmbedController | undefined): void;
  language?(controller: EmbedController): void;
}

interface Mounted {
  slug: string;
  language: LanguageCode;
  controller: EmbedController;
  root: HTMLElement;
}

function restore(controller: EmbedController, state: EmbedState): void {
  try {
    for (const [id, on] of Object.entries(state.view)) controller.setView(id, on);
    for (const [id, value] of Object.entries(state.choices)) controller.setChoice(id, value);
    controller.seek(state.progress);
    if (!state.playing) controller.pause();
  } catch (error) {
    console.warn('[wmit-widget] could not restore the scene state', error);
  }
}

export interface SceneOptions {
  loader: ModuleLoader;
  host: () => HTMLElement | null;
  callbacks: SceneCallbacks;
  webgl?: () => boolean;
  ui?: () => EmbedUiSlots;
}

export class SceneSession {
  private modules = new Map<string, Promise<EmbedModule>>();
  private attempts = new Map<string, number>();
  private current: Mounted | undefined;
  private language: LanguageCode = DEFAULT_LANGUAGE;
  private queue: Promise<void> = Promise.resolve();
  private generation = 0;
  private progressTimer: ReturnType<typeof setInterval> | undefined;
  private disposed = false;

  private readonly opts: SceneOptions;

  constructor(opts: SceneOptions) {
    this.opts = opts;
  }

  prefetch(slug: string): void {
    if (this.opts.webgl && !this.opts.webgl()) return;
    void this.module(slug).catch(() => {});
  }

  private module(slug: string): Promise<EmbedModule> {
    let p = this.modules.get(slug);
    if (!p) {
      p = this.opts.loader.load(slug, this.attempts.get(slug) ?? 0).then((mod) => {
        if (mod?.apiVersion !== EMBED_API_VERSION || typeof mod.mount !== 'function') {
          throw new Error(
            `embed module ${slug}: unsupported apiVersion ${String(mod?.apiVersion)}`,
          );
        }
        return mod;
      });
      p.catch(() => this.modules.delete(slug));
      this.modules.set(slug, p);
    }
    return p;
  }

  show(
    slug: string,
    chapter: string | undefined,
    opts: { retry?: boolean; restore?: EmbedState } = {},
  ): Promise<void> {
    const gen = ++this.generation;
    if (opts.retry) {
      this.attempts.set(slug, (this.attempts.get(slug) ?? 0) + 1);
      this.modules.delete(slug);
    }
    this.queue = this.queue.then(() => this.run(gen, slug, chapter, opts.restore)).catch(() => {});
    return this.queue;
  }

  setLanguage(language: LanguageCode): Promise<void> {
    this.language = language;
    return this.syncLanguage();
  }

  private async syncLanguage(): Promise<void> {
    const cur = this.current;
    const language = this.language;
    if (!cur || cur.language === language || this.disposed) return;
    cur.language = language;
    if (typeof cur.controller.setLanguage !== 'function') {
      const state = cur.controller.getState();
      return this.show(cur.slug, state.chapter, { restore: state });
    }
    try {
      await cur.controller.setLanguage(language);
    } catch (error) {
      console.warn('[wmit-widget] setLanguage failed', error);
    }
    if (this.current === cur) this.opts.callbacks.language?.(cur.controller);
  }

  private progress(from: number, to: number, ms: number): void {
    this.stopProgress();
    const start = performance.now();
    const gen = this.generation;
    this.opts.callbacks.status('loading', from);
    this.progressTimer = setInterval(() => {
      if (gen !== this.generation) return this.stopProgress();
      const t = 1 - Math.exp(-(performance.now() - start) / ms);
      this.opts.callbacks.status('loading', from + (to - from) * t);
    }, 120);
  }

  private stopProgress(): void {
    if (this.progressTimer) clearInterval(this.progressTimer);
    this.progressTimer = undefined;
  }

  private teardownCurrent(): void {
    const cur = this.current;
    this.current = undefined;
    this.opts.callbacks.controller(undefined);
    if (!cur) return;
    try {
      cur.controller.dispose();
    } catch (error) {
      console.warn('[wmit-widget] dispose failed', error);
    }
    cur.root.remove();
  }

  private async run(
    gen: number,
    slug: string,
    chapter: string | undefined,
    state?: EmbedState,
  ): Promise<void> {
    if (gen !== this.generation || this.disposed) return;
    this.teardownCurrent();
    const cb = this.opts.callbacks;
    if (this.opts.webgl && !this.opts.webgl()) {
      cb.status('nowebgl', 0);
      return;
    }
    const host = this.opts.host();
    if (!host) return;
    this.progress(0.04, 0.62, 900);
    let root: HTMLElement | undefined;
    try {
      const mod = await this.module(slug);
      if (gen !== this.generation || this.disposed) return;
      this.progress(0.66, 0.96, 700);
      root = document.createElement('div');
      root.className = 'scene-mount';
      host.append(root);
      const ui = this.opts.ui?.();
      const language = this.language;
      const controller = await mod.mount(root, {
        ...(chapter ? { chapter } : {}),
        ...(ui ? { ui } : {}),
        ...(state ? { autoplay: state.playing } : {}),
        language,
      });
      if (gen !== this.generation || this.disposed) {
        controller.dispose();
        root.remove();
        return;
      }
      this.stopProgress();
      if (state) restore(controller, state);
      this.current = { slug, language, controller, root };
      cb.controller(controller);
      cb.status('ready', 1);
      void this.syncLanguage();
    } catch (error) {
      this.stopProgress();
      root?.remove();
      if (gen !== this.generation || this.disposed) return;
      console.error('[wmit-widget] scene failed', error);
      const noGl = /webgl|context/i.test(String((error as Error)?.message ?? error));
      cb.status(noGl && !(error instanceof TypeError) ? 'nowebgl' : 'error', 0, error);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.generation++;
    this.stopProgress();
    this.teardownCurrent();
  }
}
