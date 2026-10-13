import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { EmbedController, EmbedInfo } from '../../../src/core/embed/contract.ts';
import type { WidgetHost } from './bridge.ts';
import { SceneSession, type ModuleLoader, type SceneStatus } from './scene.ts';
import type { StageRefs } from './views/Stage.tsx';

export function useSceneSession(host: WidgetHost, loader: ModuleLoader, webgl: () => boolean) {
  const [status, setStatus] = useState<SceneStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [controller, setController] = useState<EmbedController | undefined>();
  const [info, setInfo] = useState<EmbedInfo | undefined>();
  const [renames, setRenames] = useState<Readonly<Record<string, string>>>({});
  const hostRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const gaugeRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<EmbedController | undefined>(undefined);

  const session = useMemo(
    () =>
      new SceneSession({
        loader,
        webgl,
        host: () => hostRef.current,
        ui: () => ({
          ...(dockRef.current ? { dock: dockRef.current } : {}),
          ...(gaugeRef.current ? { gauge: gaugeRef.current } : {}),
        }),
        callbacks: {
          status: (s, p) => {
            setStatus(s);
            setProgress(p);
          },
          controller: (c) => {
            ctrlRef.current = c;
            setController(c);
          },
          language: (c) => {
            if (ctrlRef.current === c) setInfo({ ...c.info });
          },
          renamed: (from, to) => setRenames((known) => ({ ...known, [from]: to })),
        },
      }),
    [loader, webgl],
  );

  useEffect(() => host.on('teardown', () => session.dispose()), [host, session]);

  useEffect(() => () => session.dispose(), [session]);

  const refs: StageRefs = { host: hostRef, dock: dockRef, gauge: gaugeRef };
  return {
    session,
    refs,
    ctrlRef,
    controller,
    status,
    setStatus,
    progress,
    setProgress,
    info,
    setInfo,
    renames,
  };
}

export type Scene = ReturnType<typeof useSceneSession>;
