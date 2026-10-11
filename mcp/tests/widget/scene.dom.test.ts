import { describe, expect, it, vi } from 'vitest';
import type {
  EmbedController,
  EmbedModule,
  EmbedState,
  LanguageCode,
  MountOptions,
} from '../../../src/core/embed/contract.ts';
import { SceneSession } from '../../widget/src/scene.ts';

interface Fake {
  mounts: MountOptions[];
  controllers: EmbedController[];
  module: EmbedModule;
}

function fakeModule(slug: string, withSetLanguage: boolean, gate?: Promise<void>): Fake {
  const mounts: MountOptions[] = [];
  const controllers: EmbedController[] = [];
  const module: EmbedModule = {
    apiVersion: 1,
    slug,
    async mount(_container, options = {}) {
      mounts.push(options);
      await gate;
      let language = (options.language ?? 'en') as LanguageCode;
      let state: EmbedState = {
        chapter: options.chapter ?? 'one',
        playing: options.autoplay ?? true,
        phase: 0,
        progress: 0,
        phaseId: '',
        phaseLabel: '',
        speed: 1,
        view: { labels: true },
        choices: { field: 'a' },
      };
      const controller: EmbedController = {
        get info() {
          return {
            slug,
            language,
            title: `${slug} ${language}`,
            eyebrow: '',
            tagline: '',
            chapters: [],
            phases: [],
            cycle: 1,
            loop: true,
            speed: { min: 1, max: 1, step: 1, label: '' },
            toggles: [],
            choices: [],
          };
        },
        getState: () => state,
        subscribe: () => () => {},
        setChapter: (chapter) => void (state = { ...state, chapter }),
        play: () => void (state = { ...state, playing: true }),
        pause: () => void (state = { ...state, playing: false }),
        togglePlaying: () => void (state = { ...state, playing: !state.playing }),
        seek: (progress) => void (state = { ...state, progress }),
        setSpeed: () => {},
        setView: (id, on) => void (state = { ...state, view: { ...state.view, [id]: on } }),
        setChoice: (id, value) =>
          void (state = { ...state, choices: { ...state.choices, [id]: value } }),
        resetCamera: () => {},
        dispose: vi.fn(),
        ...(withSetLanguage
          ? {
              setLanguage: vi.fn(async (next: string) => {
                language = next as LanguageCode;
                return language;
              }),
            }
          : {}),
      };
      controllers.push(controller);
      return controller;
    },
  };
  return { mounts, controllers, module };
}

function session(fake: Fake) {
  const host = document.createElement('div');
  const controllers: (EmbedController | undefined)[] = [];
  const languages: LanguageCode[] = [];
  const scene = new SceneSession({
    loader: { load: async () => fake.module },
    host: () => host,
    callbacks: {
      status: () => {},
      controller: (c) => controllers.push(c),
      language: (c) => languages.push(c.info.language),
    },
  });
  return { scene, controllers, languages };
}

describe('SceneSession language', () => {
  it('mounts in the language it was given', async () => {
    const fake = fakeModule('engine', true);
    const { scene } = session(fake);
    void scene.setLanguage('uk');
    await scene.show('engine', 'one');
    expect(fake.mounts[0]?.language).toBe('uk');
  });

  it('switches a mounted module in place when it can', async () => {
    const fake = fakeModule('engine', true);
    const { scene, controllers, languages } = session(fake);
    await scene.show('engine', 'one');
    await scene.setLanguage('de');
    expect(fake.mounts).toHaveLength(1);
    expect(fake.controllers[0]?.setLanguage).toHaveBeenCalledWith('de');
    expect(languages).toEqual(['de']);
    expect(controllers.filter(Boolean)).toHaveLength(1);
    await scene.setLanguage('de');
    expect(fake.controllers[0]?.setLanguage).toHaveBeenCalledTimes(1);
  });

  it('mounts an old module again and keeps its state', async () => {
    const fake = fakeModule('engine', false);
    const { scene, controllers } = session(fake);
    await scene.show('engine', 'one');
    const first = fake.controllers[0]!;
    first.setChapter('two');
    first.setView('labels', false);
    first.setChoice('field', 'b');
    first.pause();
    first.seek(0.4);
    await scene.setLanguage('ja');
    expect(fake.mounts).toHaveLength(2);
    expect(fake.mounts[1]).toMatchObject({ language: 'ja', chapter: 'two' });
    expect(first.dispose).toHaveBeenCalled();
    const second = fake.controllers[1]!;
    expect(controllers.at(-1)).toBe(second);
    expect(second.getState()).toMatchObject({
      chapter: 'two',
      playing: false,
      progress: 0.4,
      view: { labels: false },
      choices: { field: 'b' },
    });
  });

  it('catches up when the language changes while a module mounts', async () => {
    let open = () => {};
    const fake = fakeModule('engine', true, new Promise((resolve) => (open = resolve)));
    const { scene, languages } = session(fake);
    const shown = scene.show('engine', 'one');
    await vi.waitFor(() => expect(fake.mounts).toHaveLength(1));
    void scene.setLanguage('zh');
    open();
    await shown;
    await vi.waitFor(() => expect(languages).toEqual(['zh']));
    expect(fake.mounts[0]?.language).toBe('en');
  });
});
