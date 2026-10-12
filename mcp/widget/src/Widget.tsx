import { useEffect, useRef, useState } from 'preact/hooks';
import { explainerUrl, type WidgetCatalogueEntry } from '../../shared/catalogue.ts';
import type { WidgetHost } from './bridge.ts';
import { StringsContext } from './i18n/context.ts';
import type { Packs } from './i18n/packs.ts';
import type { ModuleLoader, SceneStatus } from './scene.ts';
import { allowsFullscreen, chapterViews, frameOf, neighbour, stripOrder } from './state.ts';
import { ChapterSection } from './views/Chapter.tsx';
import { Drawer, ExploreStrip } from './views/Explore.tsx';
import { ProseColumn } from './views/Prose.tsx';
import { Header, Stage } from './views/Stage.tsx';
import type { Actions, ViewModel } from './views/types.ts';
import { SITE_HOME } from './views/Brand.tsx';
import { Unknown, Waiting } from './views/Empty.tsx';
import { useKeyboard } from './keyboard.ts';
import { useDisplayMode } from './useDisplayMode.ts';
import { useHostContext } from './useHostContext.ts';
import { useModelContextSync } from './useModelContextSync.ts';
import { useSceneSession } from './useSceneSession.ts';
import { useSceneSync } from './useSceneSync.ts';
import { useStage } from './useStage.ts';
import { useTarget } from './useTarget.ts';
import { useWidgetLanguage } from './useWidgetLanguage.ts';

export interface WidgetProps {
  host: WidgetHost;
  loader: ModuleLoader;
  assetBase: string;
  packs: Packs;
  webgl: () => boolean;
}

export function Widget({ host, loader, assetBase, packs, webgl }: WidgetProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const painted = useRef(false);

  const sceneSession = useSceneSession(host, loader, webgl);
  const { session, refs, ctrlRef, controller, status, progress, info, setInfo } = sceneSession;
  const { pack, waiting } = useWidgetLanguage(host, packs, session);
  const catalogue = pack.catalogue;
  const entries = catalogue.explainers;
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const find = (slug: string): WidgetCatalogueEntry | undefined =>
    entriesRef.current.find((e) => e.slug === slug);
  const { target, setTarget, inputSeen, resultSeen } = useTarget(host, find, session);
  const ctx = useHostContext(host);

  const slug = target?.slug;
  const entry = slug ? find(slug) : undefined;
  const hold = !painted.current && waiting;

  const { chapter, chapterRef, setChapter, disc, live, stripFirst } = useSceneSync(
    sceneSession,
    target,
    entry,
    hold,
    webgl,
  );

  const userChanged = useModelContextSync(host, {
    slug,
    entry,
    chapter,
    disc,
    info,
    lang: pack.lang,
    ctrlRef,
  });

  const { fullscreen, toggleFullscreen } = useDisplayMode(host);
  const canFullscreen = allowsFullscreen(ctx);
  useEffect(() => {
    if (!fullscreen) setDrawerOpen(false);
  }, [fullscreen]);

  const sceneReady = status === 'ready' && controller?.info.slug === slug;
  const wheelArmed = useStage(refs, ctrlRef, entry !== undefined, fullscreen, sceneReady);

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
    toggleFullscreen,
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

  useKeyboard(actions, info, disc, sceneReady);

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
