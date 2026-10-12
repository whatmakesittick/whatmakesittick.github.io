import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { WidgetCatalogueEntry } from '../../shared/catalogue.ts';
import type { EmbedState } from '../../../src/core/embed/contract.ts';
import { createLive } from './live.ts';
import { discreteOf, EMPTY_DISCRETE, sameDiscrete, wantedChapter, type Target } from './state.ts';
import type { Scene } from './useSceneSession.ts';
import type { Discrete } from './views/types.ts';

export function useSceneSync(
  scene: Scene,
  target: Target | undefined,
  entry: WidgetCatalogueEntry | undefined,
  hold: boolean,
  webgl: () => boolean,
) {
  const { session, ctrlRef, controller, setInfo, setStatus, setProgress } = scene;
  const [chapter, setChapterState] = useState<string>('');
  const [disc, setDisc] = useState<Discrete>(EMPTY_DISCRETE);
  const [stripFirst, setStripFirst] = useState<string | undefined>();
  const live = useMemo(createLive, []);
  const chapterRef = useRef('');
  const setChapter = (id: string) => {
    chapterRef.current = id;
    setChapterState(id);
  };

  useEffect(() => {
    if (!target || !entry || hold) return;
    setStripFirst((f) => f ?? target.slug);
    const wanted = wantedChapter(entry, target.chapter);
    const ctrl = ctrlRef.current;
    if (ctrl && ctrl.info.slug === target.slug) {
      if (ctrl.getState().chapter !== wanted) ctrl.setChapter(wanted);
      setChapter(wanted);
      return;
    }
    setChapter(wanted);
    setInfo(undefined);
    setDisc(EMPTY_DISCRETE);
    live.reset(undefined);
    setStatus(webgl() ? 'loading' : 'nowebgl');
    setProgress(0.04);
    void session.show(target.slug, wanted);
  }, [target?.slug, target?.chapter, hold]);

  useEffect(() => {
    if (!controller) return;
    setInfo(controller.info);
    const apply = (s: EmbedState) => {
      live.push(s);
      setDisc((prev) => {
        const next = discreteOf(s);
        return sameDiscrete(prev, next) ? prev : next;
      });
      if (s.chapter && s.chapter !== chapterRef.current) setChapter(s.chapter);
    };
    const first = controller.getState();
    if (chapterRef.current && first.chapter !== chapterRef.current)
      controller.setChapter(chapterRef.current);
    apply(controller.getState());
    live.reset(controller.getState());
    return controller.subscribe(apply);
  }, [controller]);

  return { chapter, chapterRef, setChapter, disc, live, stripFirst };
}
