import type { RefObject } from 'preact';
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import type { EmbedController } from '../../../src/core/embed/contract.ts';
import { reserveDock, type DockReserve } from './dockReserve.ts';
import { watchGaugeClearance } from './gaugeClearance.ts';
import type { StageRefs } from './views/Stage.tsx';

export function useStage(
  refs: StageRefs,
  ctrlRef: RefObject<EmbedController | undefined>,
  stageShown: boolean,
  fullscreen: boolean,
  sceneReady: boolean,
) {
  const wheelArmed = useRef(false);
  const resumeOnVisible = useRef(false);
  const dockReserve = useRef<DockReserve | undefined>(undefined);

  useEffect(() => {
    const stage = refs.host.current?.closest<HTMLElement>('[data-stage]');
    if (!stage || typeof ResizeObserver === 'undefined') return;
    return watchGaugeClearance(stage);
  }, [stageShown]);

  useEffect(() => {
    const slot = refs.dock.current;
    if (!slot) return;
    const reserve = reserveDock(slot);
    dockReserve.current = reserve;
    return () => {
      reserve.dispose();
      dockReserve.current = undefined;
    };
  }, [stageShown]);

  useLayoutEffect(() => {
    dockReserve.current?.sync({ inline: !fullscreen, ready: sceneReady });
  }, [sceneReady, fullscreen, stageShown]);

  useEffect(() => {
    const stage = refs.host.current?.closest('[data-stage]');
    if (!stage || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => {
      const ctrl = ctrlRef.current;
      if (!ctrl || !e) return;
      if (!e.isIntersecting) {
        if (ctrl.getState().playing) {
          resumeOnVisible.current = true;
          ctrl.pause();
        }
      } else if (resumeOnVisible.current) {
        resumeOnVisible.current = false;
        ctrl.play();
      }
    });
    io.observe(stage);
    return () => io.disconnect();
  }, [stageShown]);

  useEffect(() => {
    const el = refs.host.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!fullscreen && !wheelArmed.current) e.stopPropagation();
    };
    el.addEventListener('wheel', onWheel, { capture: true });
    return () => el.removeEventListener('wheel', onWheel, { capture: true });
  }, [fullscreen, stageShown]);

  return wheelArmed;
}
