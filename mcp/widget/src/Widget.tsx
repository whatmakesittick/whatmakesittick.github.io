import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  explainerUrl,
  type WidgetCatalogue,
  type WidgetCatalogueEntry,
} from '../../shared/catalogue.ts';
import type { EmbedController, EmbedInfo, EmbedState } from '../../../src/core/embed/contract.ts';
import { EMBED_DOM } from '../../../src/core/embed/contract.ts';
import { MODEL_CONTEXT_DEBOUNCE_MS, type ModelContextSnapshot } from '../../shared/tools.ts';
import type { DisplayMode, WidgetHost } from './bridge.ts';
import { createLive } from './live.ts';
import { SceneSession, type ModuleLoader, type SceneStatus } from './scene.ts';
import {
  chapterShort,
  debounce,
  modelContextText,
  neighbour,
  sameSnapshot,
  snapshotOf,
  stripOrder,
  targetFromInput,
  targetFromResult,
  type Target,
} from './state.ts';
import { ChapterSection } from './views/Chapter.tsx';
import { Drawer, ExploreStrip } from './views/Explore.tsx';
import { ProseColumn } from './views/Prose.tsx';
import { Header, Stage } from './views/Stage.tsx';
import type { Actions, ChapterView, Discrete, ViewModel } from './views/types.ts';
import { Unknown, Waiting } from './views/Empty.tsx';
import { useKeyboard } from './keyboard.ts';

export interface WidgetProps {
  host: WidgetHost;
  loader: ModuleLoader;
  assetBase: string;
  catalogue: WidgetCatalogue & { taglines: Record<string, string> };
  webgl: () => boolean;
}

const EMPTY: Discrete = { playing: false, view: {}, choices: {} };

function discreteOf(s: EmbedState): Discrete {
  return { playing: s.playing, view: s.view, choices: s.choices };
}
const sameDiscrete = (a: Discrete, b: Discrete) =>
  a.playing === b.playing &&
  JSON.stringify(a.view) === JSON.stringify(b.view) &&
  JSON.stringify(a.choices) === JSON.stringify(b.choices);

export function Widget({ host, loader, assetBase, catalogue, webgl }: WidgetProps) {
  const entries = catalogue.explainers;
  const find = (slug: string): WidgetCatalogueEntry | undefined =>
    entries.find((e) => e.slug === slug);

  const [target, setTarget] = useState<Target | undefined>();
  const [resultSeen, setResultSeen] = useState(false);
  const [chapter, setChapterState] = useState<string>('');
  const [status, setStatus] = useState<SceneStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [controller, setController] = useState<EmbedController | undefined>();
  const [info, setInfo] = useState<EmbedInfo | undefined>();
  const [disc, setDisc] = useState<Discrete>(EMPTY);
  const [ctx, setCtx] = useState(host.context() ?? {});
  const [mode, setMode] = useState<DisplayMode>(
    (host.context()?.displayMode as DisplayMode) ?? 'inline',
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stripFirst, setStripFirst] = useState<string | undefined>();

  const live = useMemo(createLive, []);
  const hostRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const gaugeRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<EmbedController | undefined>(undefined);
  const chapterRef = useRef('');
  const wheelArmed = useRef(false);
  const resumeOnVisible = useRef(false);
  const userChanged = useRef(false);
  const lastSent = useRef<ModelContextSnapshot | undefined>(undefined);

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
        },
      }),
    [loader, webgl],
  );

  useEffect(() => {
    const offs = [
      host.on('input', (args) => {
        const t = targetFromInput(args, find);
        if (!t) return;
        session.prefetch(t.slug);
        setTarget((prev) => prev ?? t);
      }),
      host.on('result', (result) => {
        setResultSeen(true);
        const t = targetFromResult(result, find);
        if (t)
          setTarget((prev) =>
            prev && prev.slug === t.slug && prev.chapter === t.chapter ? prev : { ...prev, ...t },
          );
      }),
      host.on('context', (c) => {
        setCtx({ ...c });
        if (c.displayMode) setMode(c.displayMode as DisplayMode);
      }),
      host.on('teardown', () => session.dispose()),
    ];
    return () => offs.forEach((off) => off());
  }, [host, session]);

  useEffect(() => () => session.dispose(), [session]);

  const slug = target?.slug;
  const entry = slug ? find(slug) : undefined;

  useEffect(() => {
    if (!target || !entry) return;
    setStripFirst((f) => f ?? target.slug);
    const first = entry.chapters[0]?.id ?? '';
    const wanted =
      target.chapter && entry.chapters.some((c) => c.id === target.chapter)
        ? target.chapter
        : first;
    const ctrl = ctrlRef.current;
    if (ctrl && ctrl.info.slug === target.slug) {
      if (ctrl.getState().chapter !== wanted) ctrl.setChapter(wanted);
      chapterRef.current = wanted;
      setChapterState(wanted);
      return;
    }
    chapterRef.current = wanted;
    setChapterState(wanted);
    setInfo(undefined);
    setDisc(EMPTY);
    live.reset(undefined);
    setStatus(webgl() ? 'loading' : 'nowebgl');
    setProgress(0.04);
    void session.show(target.slug, wanted);
  }, [target?.slug, target?.chapter]);

  useEffect(() => {
    if (!controller) return;
    setInfo(controller.info);
    const apply = (s: EmbedState) => {
      live.push(s);
      setDisc((prev) => {
        const next = discreteOf(s);
        return sameDiscrete(prev, next) ? prev : next;
      });
      if (s.chapter && s.chapter !== chapterRef.current) {
        chapterRef.current = s.chapter;
        setChapterState(s.chapter);
      }
    };
    const first = controller.getState();
    if (chapterRef.current && first.chapter !== chapterRef.current)
      controller.setChapter(chapterRef.current);
    apply(controller.getState());
    live.reset(controller.getState());
    return controller.subscribe(apply);
  }, [controller]);

  const sendContext = useMemo(
    () =>
      debounce((snap: ModelContextSnapshot, text: string) => {
        if (sameSnapshot(lastSent.current, snap)) return;
        lastSent.current = snap;
        void host
          .updateModelContext(text, snap)
          .catch((e: unknown) => console.warn('[wmit-widget] updateModelContext', e));
      }, MODEL_CONTEXT_DEBOUNCE_MS),
    [host],
  );
  useEffect(() => {
    if (!slug || !entry || !host.canUpdateModelContext()) return;
    const state = ctrlRef.current?.info.slug === slug ? ctrlRef.current.getState() : undefined;
    if (!userChanged.current) return;
    const snap = snapshotOf(slug, state, chapter);
    sendContext(snap, modelContextText(entry, ctrlRef.current?.info, snap, state));
  }, [slug, chapter, disc, info]);

  const fullscreen = mode === 'fullscreen';
  const canFullscreen =
    ctx.availableDisplayModes === undefined || ctx.availableDisplayModes.includes('fullscreen');
  useEffect(() => {
    const root = document.documentElement;
    if (fullscreen) root.dataset[EMBED_DOM.stageExpandedKey] = '';
    else delete root.dataset[EMBED_DOM.stageExpandedKey];
    if (!fullscreen) setDrawerOpen(false);
  }, [fullscreen]);

  useEffect(() => {
    const stage = hostRef.current?.closest('[data-stage]');
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
  }, [entry !== undefined]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!fullscreen && !wheelArmed.current) e.stopPropagation();
    };
    el.addEventListener('wheel', onWheel, { capture: true });
    return () => el.removeEventListener('wheel', onWheel, { capture: true });
  }, [fullscreen, entry !== undefined]);

  const touched =
    <A extends unknown[]>(fn: (...a: A) => void) =>
    (...a: A) => {
      userChanged.current = true;
      fn(...a);
    };
  const actions: Actions = {
    setChapter: touched((id: string) => {
      chapterRef.current = id;
      setChapterState(id);
      ctrlRef.current?.setChapter(id);
    }),
    step(dir) {
      if (!entry) return;
      const ids = (info?.chapters ?? entry.chapters).map((c) => c.id);
      const next = neighbour(ids, chapterRef.current, dir);
      if (next) actions.setChapter(next);
    },
    togglePlay: touched(() => ctrlRef.current?.togglePlaying()),
    seek: (p) => ctrlRef.current?.seek(p),
    setView: touched((id: string, on: boolean) => ctrlRef.current?.setView(id, on)),
    setChoice: touched((id: string, value: string) => ctrlRef.current?.setChoice(id, value)),
    resetCamera: () => ctrlRef.current?.resetCamera(),
    openSite: () => slug && void host.openLink(explainerUrl(slug)),
    async toggleFullscreen() {
      const next: DisplayMode = fullscreen ? 'inline' : 'fullscreen';
      try {
        setMode(await host.requestDisplayMode(next));
      } catch (e) {
        console.warn('[wmit-widget] requestDisplayMode', e);
      }
    },
    switchTo: touched((next: string) => {
      setDrawerOpen(false);
      if (next !== slug) setTarget({ slug: next });
    }),
    retry() {
      if (!slug) return;
      setInfo(undefined);
      void session.show(slug, chapterRef.current, { retry: true });
    },
    toggleDrawer: (open) => setDrawerOpen((v) => open ?? !v),
  };

  useKeyboard(actions, info, disc, status === 'ready' && controller?.info.slug === slug);

  const insets = ctx.safeAreaInsets;
  const radius = (ctx.styles?.variables as Record<string, string | undefined> | undefined)?.[
    '--border-radius-xl'
  ];
  const touch =
    ctx.deviceCapabilities?.touch ??
    (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
  const style: Record<string, string> = {
    '--safe-top': `${insets?.top ?? 0}px`,
    '--safe-right': `${insets?.right ?? 0}px`,
    '--safe-bottom': `${insets?.bottom ?? 0}px`,
    '--safe-left': `${insets?.left ?? 0}px`,
  };
  if (radius) style['--border-radius-xl'] = radius;
  const rootClass = `wmit ${fullscreen ? 'is-fs' : 'is-inline'}${touch ? ' touch' : ''}`;

  if (!entry || !slug) {
    return (
      <div class={rootClass} style={style}>
        {resultSeen ? (
          <Unknown
            catalogue={entries}
            assetBase={assetBase}
            onPick={(s) => setTarget({ slug: s })}
          />
        ) : (
          <Waiting />
        )}
      </div>
    );
  }

  const chapters: ChapterView[] = entry.chapters.map((c, i) => {
    const fromInfo = info?.chapters.find((x) => x.id === c.id);
    return {
      id: c.id,
      index: i + 1,
      title: fromInfo?.title ?? c.title,
      short: chapterShort(c.id),
      paragraphsHtml: fromInfo?.paragraphsHtml ?? [],
    };
  });

  const shownStatus: SceneStatus =
    status === 'ready' && controller?.info.slug !== slug ? 'loading' : status;
  const vm: ViewModel = {
    slug,
    entry,
    tagline: info?.tagline ?? catalogue.taglines[slug] ?? entry.summary,
    info,
    status: shownStatus,
    progress,
    chapter,
    chapters,
    disc,
    live,
    fullscreen,
    canFullscreen,
    drawerOpen,
    siteDock: controller?.info.slug === slug && controller.ui?.dock === true,
    assetBase,
    catalogue: entries,
    strip: stripOrder(entries, stripFirst ?? slug),
    actions,
  };

  return (
    <div class={`${rootClass} st-${shownStatus}`} style={style} data-slug={slug}>
      <Header key="header" vm={vm} />
      <Stage
        key="stage"
        vm={vm}
        refs={{ host: hostRef, dock: dockRef, gauge: gaugeRef }}
        onPointerDown={() => (wheelArmed.current = true)}
        onPointerLeave={() => (wheelArmed.current = false)}
        onUserInput={() => (userChanged.current = true)}
      />
      <ProseColumn key="prose" vm={vm} />
      <Drawer key="drawer" vm={vm} />
      <ChapterSection key="chapter" vm={vm} />
      <ExploreStrip key="explore" vm={vm} />
    </div>
  );
}
