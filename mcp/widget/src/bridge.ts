import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import type { ModelContextSnapshot } from '../../shared/tools.ts';

export type DisplayMode = 'inline' | 'fullscreen';

export interface HostEvents {
  input: (args: unknown) => void;
  result: (result: unknown) => void;
  context: (ctx: Partial<McpUiHostContext>) => void;
  teardown: () => void;
}

export interface WidgetHost {
  context(): Partial<McpUiHostContext> | undefined;
  syncContext?(): void;
  canUpdateModelContext(): boolean;
  openLink(url: string): Promise<void>;
  requestDisplayMode(mode: DisplayMode): Promise<DisplayMode>;
  updateModelContext(text: string, snapshot: ModelContextSnapshot): Promise<void>;
  on<K extends keyof HostEvents>(event: K, listener: HostEvents[K]): () => void;
}

export function createHub() {
  const replay: Partial<Record<keyof HostEvents, unknown[]>> = {};
  const listeners: { [K in keyof HostEvents]: Set<HostEvents[K]> } = {
    input: new Set(),
    result: new Set(),
    context: new Set(),
    teardown: new Set(),
  };
  return {
    on<K extends keyof HostEvents>(event: K, listener: HostEvents[K]): () => void {
      listeners[event].add(listener);
      const last = event !== 'teardown' ? replay[event as keyof HostEvents] : undefined;
      if (last) (listener as (...a: unknown[]) => void)(...last);
      return () => listeners[event].delete(listener);
    },
    emit<K extends keyof HostEvents>(event: K, ...args: Parameters<HostEvents[K]>): void {
      if (event !== 'teardown') replay[event as keyof HostEvents] = args;
      for (const l of listeners[event]) (l as (...a: Parameters<HostEvents[K]>) => void)(...args);
    },
  };
}

function fallbackOpen(url: string): void {
  try {
    window.open(url, '_blank', 'noopener');
  } catch (error) {
    console.warn('[wmit-widget] could not open the link', error);
  }
}

export function createAppHost(app: App): WidgetHost {
  const hub = createHub();
  let ctx: Partial<McpUiHostContext> | undefined;
  app.ontoolinput = (params) => hub.emit('input', params.arguments);
  app.ontoolresult = (result) => hub.emit('result', result);
  const mergeContext = (change: Partial<McpUiHostContext>) => {
    ctx = { ...(ctx ?? app.getHostContext() ?? {}), ...change };
    hub.emit('context', ctx);
  };
  app.onhostcontextchanged = mergeContext;
  app.onteardown = async () => {
    hub.emit('teardown');
    return {};
  };
  app.onerror = (error) => console.error('[wmit-widget]', error);

  return {
    syncContext: () => mergeContext({}),
    context: () => ctx ?? app.getHostContext(),
    canUpdateModelContext: () => !!app.getHostCapabilities()?.updateModelContext,
    async openLink(url) {
      try {
        const res = await app.openLink({ url });
        if (res.isError) fallbackOpen(url);
      } catch {
        fallbackOpen(url);
      }
    },
    async requestDisplayMode(mode) {
      const res = await app.requestDisplayMode({ mode });
      return res.mode as DisplayMode;
    },
    async updateModelContext(text, snapshot) {
      await app.updateModelContext({
        content: [{ type: 'text', text }],
        structuredContent: { ...snapshot },
      });
    },
    on: hub.on,
  };
}
