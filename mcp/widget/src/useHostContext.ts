import { useEffect, useState } from 'preact/hooks';
import type { WidgetHost } from './bridge.ts';

export function useHostContext(host: WidgetHost) {
  const [ctx, setCtx] = useState(host.context() ?? {});
  useEffect(() => host.on('context', (c) => setCtx({ ...c })), [host]);
  return ctx;
}
