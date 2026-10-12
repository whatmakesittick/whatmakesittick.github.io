import { resolveLanguage, type WidgetCatalogueEntry } from '../../../shared/catalogue.ts';
import type {
  EmbedChoiceInfo,
  EmbedController,
  EmbedInfo,
  EmbedModule,
  EmbedPhaseInfo,
  EmbedState,
  EmbedToggleInfo,
  LanguageCode,
  MountOptions,
} from '../../../../src/core/embed/contract.ts';
import { EMBED_DOM } from '../../../../src/core/embed/contract.ts';
import { scopedControlsCss } from '../../../../src/core/embed/styles.ts';
import dockMarkup from '../../../../src/core/partials/dock.html?raw';
import type { Packs } from '../i18n/packs.ts';
import type { ModuleLoader } from '../scene.ts';

const PHASES: [string, string, number, string][] = [
  ['excite', '90° pulse', 15, '#ffb347'],
  ['encode', 'Encode', 14, '#6fd38a'],
  ['refocus', '180° pulse', 12, '#ffb347'],
  ['echo', 'Echo', 23, '#4fd1c5'],
  ['recover', 'Recover', 36, '#8b929c'],
];

const ICONS = {
  cutaway:
    '<rect x="3.5" y="5" width="17" height="14" rx="7"/><circle cx="12" cy="12" r="3.2"/><path d="M12 5v4M12 15v4"/>',
  field:
    '<path d="M3 12h18"/><path d="M4 12c0-4 4-7 8-7s8 3 8 7"/><path d="M4 12c0 4 4 7 8 7s8-3 8-7"/><path d="m17.6 10.4 1.9 1.6-1.9 1.6"/>',
  labels: '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z"/><circle cx="8" cy="8" r="1.6"/>',
};

const TOGGLES: EmbedToggleInfo[] = [
  {
    id: 'cutaway',
    label: 'Cutaway',
    short: 'Cutaway',
    hint: 'Open the wedge',
    icon: ICONS.cutaway,
    shortcut: 'C',
  },
  {
    id: 'fieldLines',
    label: 'Field lines',
    short: 'Field',
    hint: 'Show the field lines',
    icon: ICONS.field,
    shortcut: 'F',
  },
  {
    id: 'labels',
    label: 'Labels',
    short: 'Labels',
    hint: 'Show the labels',
    icon: ICONS.labels,
    shortcut: 'L',
  },
];

const CHOICES: EmbedChoiceInfo[] = [
  {
    id: 'field',
    label: 'Field strength',
    shortcut: 'B',
    options: [
      { value: '1.5', label: '1.5 T' },
      { value: '3', label: '3 T' },
    ],
  },
  {
    id: 'weighting',
    label: 'Picture type',
    shortcut: 'W',
    options: [
      { value: 't1', label: 'T1-weighted' },
      { value: 't2', label: 'T2-weighted' },
    ],
  },
];

const MRI_TEXT: Record<string, string[]> = {
  overview: [
    'This is an MRI scanner. MRI is short for <strong>magnetic resonance imaging</strong>. Its magnet has a strength of 1.5 tesla. You lie on the table, and it slides you into the bore, a tunnel about 70 cm wide.',
  ],
  magnet: [
    'The biggest part is the main magnet: about 30 to 40 km of niobium-titanium wire wound into coils. When this wire is cooled far enough, it becomes <strong>superconducting</strong>. That means current flows through it with no resistance at all. Several hundred amperes run round and round in a closed loop. Once the loop is closed, keeping the field going takes no power.',
    'To stay superconducting, the coils sit in liquid helium at 4.2 kelvin, about −269 °C. So the helium is only about 1.5 K warmer than deep space. Around the helium vessel, a heat shield and a vacuum keep the warmth out, like a thermos flask. The open wedge shows these layers.',
  ],
};

const LABELS: [string, number, number, boolean][] = [
  ['Cold head', 52, 19, false],
  ['Main magnet coils', 45, 33, true],
  ['Helium vessel', 41, 25, true],
  ['Heat shield', 66, 50, false],
  ['Hydrogen nuclei', 42, 55, true],
];

const LOREM = (title: string) => [
  `${title}. This is placeholder text from the dev mock embed: the real paragraphs come from the explainer module once the 3D scene is mounted.`,
  'A second paragraph shows how <strong>Read more</strong> expands the chapter inline and how the fullscreen panel scrolls.',
];

function infoFor(entry: WidgetCatalogueEntry, tagline: string, language: LanguageCode): EmbedInfo {
  const cycle = PHASES.reduce((s, p) => s + p[2], 0) * 40;
  let at = 0;
  const phases: EmbedPhaseInfo[] = PHASES.map(([id, label, share, tone]) => {
    const start = at;
    at += share * 40;
    return { id, label, tone, start, end: at };
  });
  return {
    slug: entry.slug,
    language,
    title: entry.title,
    eyebrow: entry.eyebrow,
    tagline,
    chapters: entry.chapters.map((c, i) => ({
      id: c.id,
      index: i + 1,
      title: c.title,
      paragraphsHtml:
        (entry.slug === 'mri-scanner' && language === 'en' ? MRI_TEXT[c.id] : undefined) ??
        LOREM(c.title),
    })),
    phases,
    cycle,
    loop: true,
    speed: { min: 0.25, max: 2, step: 0.25, label: 'Speed' },
    toggles: TOGGLES,
    choices: CHOICES,
  };
}

const css = `
.mock-scene{position:absolute;inset:0;overflow:hidden;container-type:size;cursor:grab}
.mock-fit{position:absolute;left:50%;top:50%;width:max(100cqw,calc(100cqh*932/699));aspect-ratio:932/699;transform:translate(-50%,-50%)}
.mock-fit img{width:100%;height:100%;display:block}
.mock-lbl{position:absolute;width:0;height:0}
.mock-lbl i{position:absolute;left:-4px;top:-4px;width:8px;height:8px;border-radius:50%;background:#f5a524;box-shadow:0 0 0 3px rgb(245 165 36/.22)}
.mock-lbl b{position:absolute;left:0;top:0;width:30px;height:1px;background:linear-gradient(90deg,#f5a524,rgb(245 165 36/.45));transform:rotate(-32deg);transform-origin:0 50%}
.mock-lbl span{position:absolute;left:24px;top:-34px;white-space:nowrap;padding:4px 10px;border:1px solid rgb(245 165 36/.55);border-radius:999px;background:rgb(20 24 30/.88);font:500 12px/1.2 var(--font-sans);color:#e6e9ee}
.mock-lbl.left b{transform:rotate(-148deg)}.mock-lbl.left span{left:auto;right:24px}
.mock-scene.nolabels .mock-lbl{display:none}`;

interface MockDockActions {
  togglePlaying(): void;
  seek(progress: number): void;
}

function mockDock(
  slot: HTMLElement,
  info: EmbedInfo,
  actions: MockDockActions,
): (state: EmbedState) => void {
  slot.innerHTML = dockMarkup;
  slot.setAttribute(EMBED_DOM.uiAttr, '');
  slot.querySelector('[data-language-select]')?.remove();
  const dock = slot.querySelector<HTMLElement>('[data-dock]');
  const play = slot.querySelector<HTMLButtonElement>('[data-control="play"]');
  const scrubber = slot.querySelector<HTMLInputElement>('[data-control="scrubber"]');
  const group = slot.querySelector<HTMLElement>('[data-phase-buttons]');
  const more = slot.querySelector<HTMLButtonElement>('[data-control="more"]');
  const name = slot.querySelector<HTMLElement>('[data-status="name"]');
  if (!dock || !play || !scrubber || !group || !more) return () => {};
  dock.style.removeProperty('visibility');
  const { cycle, phases } = info;
  const buttons = phases.map((phase) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = phase.label;
    button.style.setProperty('--tone', phase.tone);
    button.addEventListener('click', () => actions.seek(phase.start / cycle + 1e-4));
    return button;
  });
  group.replaceChildren(...buttons);
  group.style.setProperty(
    '--phase-columns',
    phases.map((p) => `minmax(0, ${(p.end - p.start) / cycle}fr)`).join(' '),
  );
  const stops = phases.map((p, i) =>
    i === phases.length - 1
      ? `${p.tone} 0`
      : `${p.tone} 0 calc(${(p.end / cycle) * 100}% - var(--track-gap)), transparent 0 calc(${(p.end / cycle) * 100}% + var(--track-gap))`,
  );
  scrubber.style.setProperty('--phase-bands', `linear-gradient(90deg, ${stops.join(', ')})`);
  scrubber.min = '0';
  scrubber.max = String(cycle);
  scrubber.addEventListener('input', () => actions.seek(Number(scrubber.value) / cycle));
  play.addEventListener('click', () => actions.togglePlaying());
  more.addEventListener('click', () => {
    const expanded = more.getAttribute('aria-expanded') !== 'true';
    more.setAttribute('aria-expanded', String(expanded));
    dock.dataset.expanded = String(expanded);
  });
  return (state) => {
    play.dataset.playing = String(state.playing);
    scrubber.value = String(state.phase);
    if (name) name.textContent = state.phaseLabel;
    phases.forEach((phase, i) =>
      buttons[i]?.setAttribute('aria-pressed', String(phase.id === state.phaseId)),
    );
  };
}

export interface MockOptions {
  catalogue: WidgetCatalogueEntry[];
  taglines: Record<string, string>;
  coverBase: string;
  delay?: number;
  fail?: 'error' | 'loading';
  failSlugs?: string[];
  packs?: Packs;
  inPlace?: boolean;
}

export function mockModule(slug: string, opts: MockOptions): EmbedModule {
  const entry = opts.catalogue.find((e) => e.slug === slug);
  if (!entry) throw new Error(`mock: unknown slug ${slug}`);
  return {
    apiVersion: 1,
    slug,
    async mount(container: HTMLElement, options: MountOptions = {}): Promise<EmbedController> {
      const describe = async (wanted: string | undefined): Promise<EmbedInfo> => {
        const pack = await opts.packs?.load(resolveLanguage(wanted));
        const shown = pack?.catalogue.explainers.find((e) => e.slug === slug) ?? entry;
        const tagline = pack?.catalogue.taglines[slug] ?? opts.taglines[slug] ?? shown.summary;
        return infoFor(shown, tagline, pack?.lang ?? 'en');
      };
      let info = await describe(options.language);
      const style = document.createElement('style');
      style.setAttribute('data-embed-styles', slug);
      style.textContent = `${css}\n${scopedControlsCss()}`;
      document.head.append(style);
      const root = document.createElement('div');
      root.className = 'mock-scene';
      const fit = document.createElement('div');
      fit.className = 'mock-fit';
      const img = document.createElement('img');
      img.src = `${opts.coverBase}${opts.catalogue.find((e) => e.slug === slug)?.cover ?? ''}`;
      img.alt = '';
      fit.append(img);
      if (slug === 'mri-scanner') {
        for (const [text, x, y, left] of LABELS) {
          const l = document.createElement('div');
          l.className = `mock-lbl${left ? ' left' : ''}`;
          l.style.left = `${x}%`;
          l.style.top = `${y}%`;
          l.append(document.createElement('i'), document.createElement('b'));
          const s = document.createElement('span');
          s.textContent = text;
          l.append(s);
          fit.append(l);
        }
      }
      root.append(fit);
      container.append(root);

      const listeners = new Set<(s: EmbedState) => void>();
      const dockSlot = options.ui?.dock;
      let renderDock: (s: EmbedState) => void = () => {};
      const first = info.chapters[0]?.id ?? '';
      let state: EmbedState = {
        chapter:
          options.chapter && info.chapters.some((c) => c.id === options.chapter)
            ? options.chapter
            : first,
        playing: options.autoplay ?? true,
        phase: info.cycle * 0.22,
        progress: 0.22,
        phaseId: '',
        phaseLabel: '',
        speed: 1,
        view: { cutaway: true, fieldLines: false, labels: true },
        choices: { field: '1.5', weighting: 't2' },
      };
      const set = (patch: Partial<EmbedState>) => {
        const phase = patch.phase ?? state.phase;
        const p = info.phases.find((x) => phase >= x.start && phase < x.end) ?? info.phases[0];
        state = {
          ...state,
          ...patch,
          phase,
          progress: phase / info.cycle,
          phaseId: p?.id ?? '',
          phaseLabel: p?.label ?? '',
        };
        root.classList.toggle('nolabels', !state.view.labels);
        renderDock(state);
        listeners.forEach((l) => l(state));
      };
      if (dockSlot)
        renderDock = mockDock(dockSlot, info, {
          togglePlaying: () => set({ playing: !state.playing }),
          seek: (p) => set({ phase: Math.min(0.9999, Math.max(0, p)) * info.cycle }),
        });
      set({});
      let last = performance.now();
      let raf = 0;
      const tick = (now: number) => {
        const dt = now - last;
        last = now;
        if (state.playing && !document.hidden)
          set({ phase: (state.phase + dt * state.speed) % info.cycle });
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      await new Promise((r) => setTimeout(r, 150));
      const switchLanguage = async (wanted: string): Promise<LanguageCode> => {
        info = await describe(wanted);
        set({});
        return info.language;
      };
      return {
        get info() {
          return info;
        },
        ui: { dock: dockSlot !== undefined, gauge: false },
        ...(opts.inPlace === false ? {} : { setLanguage: switchLanguage }),
        getState: () => state,
        subscribe(l) {
          listeners.add(l);
          return () => listeners.delete(l);
        },
        setChapter: (id) => set({ chapter: id }),
        play: () => set({ playing: true }),
        pause: () => set({ playing: false }),
        togglePlaying: () => set({ playing: !state.playing }),
        seek: (p) => set({ phase: Math.min(0.9999, Math.max(0, p)) * info.cycle }),
        setSpeed: (speed) => set({ speed }),
        setView: (id, on) => set({ view: { ...state.view, [id]: on } }),
        setChoice: (id, value) => set({ choices: { ...state.choices, [id]: value } }),
        resetCamera: () => {},
        dispose() {
          cancelAnimationFrame(raf);
          listeners.clear();
          root.remove();
          style.remove();
          dockSlot?.replaceChildren();
          dockSlot?.removeAttribute(EMBED_DOM.uiAttr);
        },
      };
    },
  };
}

export function mockLoader(opts: MockOptions): ModuleLoader {
  return {
    async load(slug, attempt) {
      await new Promise((r) => setTimeout(r, opts.delay ?? 600));
      if (opts.fail === 'loading' && attempt === 0) await new Promise(() => {});
      if ((opts.fail === 'error' && attempt === 0) || opts.failSlugs?.includes(slug)) {
        throw new TypeError(`Failed to fetch dynamically imported module: mock/${slug}.js`);
      }
      return mockModule(slug, opts);
    },
  };
}
