import { useEffect, useState } from 'preact/hooks';
import type { WidgetCatalogueEntry } from '../../shared/catalogue.ts';
import type { WidgetHost } from './bridge.ts';
import type { SceneSession } from './scene.ts';
import { mergeTarget, targetFromInput, targetFromResult, type Target } from './state.ts';

export function useTarget(
  host: WidgetHost,
  find: (slug: string) => WidgetCatalogueEntry | undefined,
  session: SceneSession,
) {
  const [target, setTarget] = useState<Target | undefined>();
  const [inputSeen, setInputSeen] = useState(false);
  const [resultSeen, setResultSeen] = useState(false);

  useEffect(() => {
    const offs = [
      host.on('input', (args) => {
        setInputSeen(true);
        const t = targetFromInput(args, find);
        if (!t) return;
        session.prefetch(t.slug);
        setTarget((prev) => prev ?? t);
      }),
      host.on('result', (result) => {
        setResultSeen(true);
        const t = targetFromResult(result, find);
        if (t) setTarget((prev) => mergeTarget(prev, t));
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [host, session]);

  return { target, setTarget, inputSeen, resultSeen };
}
