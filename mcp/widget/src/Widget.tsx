import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { explainerUrl, type WidgetCatalogueEntry } from '../../shared/catalogue.ts';
import { EMBED_DOM } from '../../../src/core/embed/contract.ts';
import { MODEL_CONTEXT_DEBOUNCE_MS, type ModelContextSnapshot } from '../../shared/tools.ts';
import { toDisplayMode, type DisplayMode, type WidgetHost } from './bridge.ts';
import { reserveDock, type DockReserve } from './dockReserve.ts';
import { watchGaugeClearance } from './gaugeClearance.ts';
import { StringsContext } from './i18n/context.ts';
import { NO_SIGNALS, languageOf, withContext, withInput, withResult } from './i18n/language.ts';
import type { LanguagePack, Packs } from './i18n/packs.ts';
import type { ModuleLoader, SceneStatus } from './scene.ts';
import {
  allowsFullscreen,
  chapterViews,
  debounce,
  frameOf,
  mergeTarget,
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
import type { Actions, ViewModel } from './views/types.ts';
import { SITE_HOME } from './views/Brand.tsx';
import { Unknown, Waiting } from './views/Empty.tsx';
import { useKeyboard } from './keyboard.ts';
import { useSceneSession } from './useSceneSession.ts';
import { useSceneSync } from './useSceneSync.ts';

export interface WidgetProps {
  host: WidgetHost;
  loader: ModuleLoader;
  assetBase: string;
  packs: Packs;
  webgl: () => boolean;
}

const LANGUAGE_PATIENCE_MS = 1500;

export function Widget({ host, loader, assetBase, packs, webgl }: WidgetProps) {
  const [signals, setSignals] = useState(() => withContext(NO_SIGNALS, host.context()));
  const lang = languageOf(signals);
  const [pack, setPack] = useState<LanguagePack>(() => packs.ready(lang) ?? packs.english);
  const [settled, setSettled] = useState(() => (packs.ready(lang) ? lang : undefined));
  const [patient, setPatient] = useState(true);
  const [inputSeen, setInputSeen] = useState(false);
  const catalogue = pack.catalogue;
  const entries = catalogue.explainers;
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const find = (slug: string): WidgetCatalogueEntry | undefined =>
    entriesRef.current.find((e) => e.slug === slug);

  const [target, setTarget] = useState<Target | undefined>();
  const [resultSeen, setResultSeen] = useState(false);
  const [ctx, setCtx] = useState(host.context() ?? {});
  const [mode, setMode] = useState<DisplayMode>(
    toDisplayMode(host.context()?.displayMode) ?? 'inline',
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const wheelArmed = useRef(false);
  const resumeOnVisible = useRef(false);
  const userChanged = useRef(false);
  const lastSent = useRef<ModelContextSnapshot | undefined>(undefined);
  const langRef = useRef(lang);
  langRef.current = lang;
  const painted = useRef(false);
  const dockReserve = useRef<DockReserve | undefined>(undefined);

  const sceneSession = useSceneSession(host, loader, webgl);
  const { session, refs, ctrlRef, controller, status, progress, info, setInfo } = sceneSession;

  useEffect(() => {
    const offs = [
      host.on('input', (args) => {
        setInputSeen(true);
        setSignals((s) => withInput(s, args));
        const t = targetFromInput(args, find);
        if (!t) return;
        session.prefetch(t.slug);
        setTarget((prev) => prev ?? t);
      }),
      host.on('result', (result) => {
        setResultSeen(true);
        setSignals((s) => withResult(s, result));
        const t = targetFromResult(result, find);
        if (t) setTarget((prev) => mergeTarget(prev, t));
      }),
      host.on('context', (c) => {
        setCtx({ ...c });
        setSignals((s) => withContext(s, c));
        setMode((current) => toDisplayMode(c.displayMode) ?? current);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [host, session]);

  useEffect(() => {
    void session.setLanguage(lang);
    if (pack.lang === lang) return setSettled(lang);
    let live = true;
    const timer = setTimeout(() => setPatient(false), LANGUAGE_PATIENCE_MS);
    packs
      .load(lang)
      .then((next) => live && langRef.current === next.lang && setPack(next))
      .catch((error: unknown) => console.warn('[wmit-widget] language', lang, error))
      .finally(() => live && langRef.current === lang && setSettled(lang));
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [lang, session]);

  useEffect(() => {
    document.documentElement.lang = pack.lang;
  }, [pack.lang]);

  const slug = target?.slug;
  const entry = slug ? find(slug) : undefined;
  const hold = !painted.current && patient && settled !== lang;

  const { chapter, chapterRef, setChapter, disc, live, stripFirst } = useSceneSync(
    sceneSession,
    target,
    entry,
    hold,
    webgl,
  );

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
    sendContext(snap, modelContextText(entry, ctrlRef.current?.info, snap, state, pack.lang));
  }, [slug, chapter, disc, info, pack.lang]);

  const fullscreen = mode === 'fullscreen';
  const canFullscreen = allowsFullscreen(ctx);
  useEffect(() => {
    const root = document.documentElement;
    if (fullscreen) root.dataset[EMBED_DOM.stageExpandedKey] = '';
    else delete root.dataset[EMBED_DOM.stageExpandedKey];
    if (!fullscreen) setDrawerOpen(false);
  }, [fullscreen]);

  useEffect(() => {
    const stage = refs.host.current?.closest<HTMLElement>('[data-stage]');
    if (!stage || typeof ResizeObserver === 'undefined') return;
    return watchGaugeClearance(stage);
  }, [entry !== undefined]);

  useEffect(() => {
    const slot = refs.dock.current;
    if (!slot) return;
    const reserve = reserveDock(slot);
    dockReserve.current = reserve;
    return () => {
      reserve.dispose();
      dockReserve.current = undefined;
    };
  }, [entry !== undefined]);

  const sceneReady = status === 'ready' && controller?.info.slug === slug;
  useLayoutEffect(() => {
    dockReserve.current?.sync({ inline: !fullscreen, ready: sceneReady });
  }, [sceneReady, fullscreen, entry !== undefined]);

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
  }, [entry !== undefined]);

  useEffect(() => {
    const el = refs.host.current;
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
  const openCatalogue = () => void host.openLink(SITE_HOME);
  const actions: Actions = {
    setChapter: touched((id: string) => {
      setChapter(id);
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
    openCatalogue,
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

  const { style, touch } = frameOf(
    ctx,
    () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches,
  );
  const rootClass = `wmit ${fullscreen ? 'is-fs' : 'is-inline'}${touch ? ' touch' : ''}`;

  if (!entry || !slug || hold) {
    return (
      <StringsContext.Provider value={pack.strings}>
        <div class={rootClass} style={style} lang={pack.lang}>
          {resultSeen && !hold ? (
            <Unknown
              catalogue={entries}
              assetBase={assetBase}
              onPick={(s) => setTarget({ slug: s })}
              onOpen={openCatalogue}
            />
          ) : (
            <Waiting onOpen={openCatalogue} quiet={hold || !inputSeen} />
          )}
        </div>
      </StringsContext.Provider>
    );
  }
  painted.current = true;

  const known = info ?? (controller?.info.slug === slug ? controller.info : undefined);
  const scene = known?.language === pack.lang ? known : undefined;
  const chapters = chapterViews(entry, known, scene, pack.lang);

  const shownStatus: SceneStatus = status === 'ready' && !sceneReady ? 'loading' : status;
  const vm: ViewModel = {
    slug,
    entry,
    tagline: scene?.tagline ?? catalogue.taglines[slug] ?? entry.summary,
    info: known,
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
    <StringsContext.Provider value={pack.strings}>
      <div class={`${rootClass} st-${shownStatus}`} style={style} data-slug={slug} lang={pack.lang}>
        <Header key="header" vm={vm} />
        <Stage
          key="stage"
          vm={vm}
          refs={refs}
          onPointerDown={() => (wheelArmed.current = true)}
          onPointerLeave={() => (wheelArmed.current = false)}
          onUserInput={() => (userChanged.current = true)}
        />
        <ProseColumn key="prose" vm={vm} />
        <Drawer key="drawer" vm={vm} />
        <ChapterSection key="chapter" vm={vm} />
        <ExploreStrip key="explore" vm={vm} />
      </div>
    </StringsContext.Provider>
  );
}
