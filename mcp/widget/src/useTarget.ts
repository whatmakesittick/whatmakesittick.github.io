import { useEffect, useRef, useState } from 'preact/hooks';
import type { WidgetCatalogueEntry } from '../../shared/catalogue.ts';
import type { WidgetHost } from './bridge.ts';
import type { SceneSession } from './scene.ts';
import {
  mayShow,
  mergeTarget,
  resultFailed,
  scopeFromResult,
  targetFromInput,
  targetFromResult,
  type Scope,
  type Target,
} from './state.ts';

interface Known {
  scope: Scope | undefined;
  failed: boolean;
}

export function useTarget(
  host: WidgetHost,
  find: (slug: string) => WidgetCatalogueEntry | undefined,
  session: SceneSession,
  toolScope: Scope | undefined,
  entries: readonly WidgetCatalogueEntry[],
) {
  const [target, setTarget] = useState<Target | undefined>();
  const [inputSeen, setInputSeen] = useState(false);
  const [resultSeen, setResultSeen] = useState(false);
  const [known, setKnown] = useState<Known>({ scope: undefined, failed: false });
  const knownRef = useRef(known);
  const toolScopeRef = useRef(toolScope);
  toolScopeRef.current = toolScope;
  const seen = useRef<{ input?: unknown; result?: unknown }>({});

  const findAllowed = (slug: string) => {
    const { scope, failed } = knownRef.current;
    const entry = find(slug);
    return mayShow(entry, scope ?? toolScopeRef.current, failed) ? entry : undefined;
  };
  const findRef = useRef(findAllowed);
  findRef.current = findAllowed;

  useEffect(() => {
    const allowed = (slug: string) => findRef.current(slug);
    const offs = [
      host.on('input', (args) => {
        seen.current.input = args;
        setInputSeen(true);
        const t = targetFromInput(args, allowed);
        if (!t) return;
        session.prefetch(t.slug);
        setTarget((prev) => prev ?? t);
      }),
      host.on('result', (result) => {
        seen.current.result = result;
        setResultSeen(true);
        knownRef.current = {
          scope: scopeFromResult(result) ?? knownRef.current.scope,
          failed: resultFailed(result),
        };
        setKnown(knownRef.current);
        const t = targetFromResult(result, allowed);
        if (t) setTarget((prev) => mergeTarget(prev, t));
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [host, session]);

  useEffect(() => {
    if (target || entries.length === 0) return;
    const { input, result } = seen.current;
    const t = targetFromResult(result, findAllowed) ?? targetFromInput(input, findAllowed);
    if (!t) return;
    session.prefetch(t.slug);
    setTarget((prev) => prev ?? t);
  }, [entries]);

  return {
    target,
    setTarget,
    inputSeen,
    resultSeen,
    scope: known.scope ?? toolScope,
    failed: known.failed,
  };
}
