import { useEffect, useRef, useState } from 'preact/hooks';
import type { WidgetCatalogueEntry } from '../../shared/catalogue.ts';
import type { WidgetHost } from './bridge.ts';
import type { SceneSession } from './scene.ts';
import {
  mayShow,
  mergeTarget,
  resultFailed,
  slugsFromResult,
  targetFromInput,
  targetFromResult,
  type Target,
} from './state.ts';

interface Allowed {
  slugs: readonly string[] | undefined;
  failed: boolean;
}

export function useTarget(
  host: WidgetHost,
  find: (slug: string) => WidgetCatalogueEntry | undefined,
  session: SceneSession,
  toolSlugs: readonly string[] | undefined,
) {
  const [target, setTarget] = useState<Target | undefined>();
  const [inputSeen, setInputSeen] = useState(false);
  const [resultSeen, setResultSeen] = useState(false);
  const [known, setKnown] = useState<Allowed>({ slugs: undefined, failed: false });
  const knownRef = useRef(known);
  const toolSlugsRef = useRef(toolSlugs);
  toolSlugsRef.current = toolSlugs;

  useEffect(() => {
    const findAllowed = (slug: string) => {
      const { slugs, failed } = knownRef.current;
      return mayShow(slug, slugs ?? toolSlugsRef.current, failed) ? find(slug) : undefined;
    };
    const offs = [
      host.on('input', (args) => {
        setInputSeen(true);
        const t = targetFromInput(args, findAllowed);
        if (!t) return;
        session.prefetch(t.slug);
        setTarget((prev) => prev ?? t);
      }),
      host.on('result', (result) => {
        setResultSeen(true);
        knownRef.current = {
          slugs: slugsFromResult(result) ?? knownRef.current.slugs,
          failed: resultFailed(result),
        };
        setKnown(knownRef.current);
        const t = targetFromResult(result, findAllowed);
        if (t) setTarget((prev) => mergeTarget(prev, t));
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [host, session]);

  return {
    target,
    setTarget,
    inputSeen,
    resultSeen,
    allowed: known.slugs ?? toolSlugs,
    failed: known.failed,
  };
}
