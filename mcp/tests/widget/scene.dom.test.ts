import { describe, expect, it, vi } from 'vitest';
import type {
  EmbedController,
  EmbedModule,
  EmbedState,
  LanguageCode,
  MountOptions,
} from '../../../src/core/embed/contract.ts';
import { SceneSession, freshQuery } from '../../widget/src/scene.ts';

interface Fake {
  mounts: MountOptions[];
  controllers: EmbedController[];
  module: EmbedModule;
}

function fakeModule(slug: string, gate?: Promise<void>): Fake {
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
        handleKey: () => false,
        setLanguage: vi.fn(async (next: string) => {
          language = next as LanguageCode;
          return language;
        }),
        dispose: vi.fn(),
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
    const fake = fakeModule('engine');
    const { scene } = session(fake);
    void scene.setLanguage('uk');
    await scene.show('engine', 'one');
    expect(fake.mounts[0]?.language).toBe('uk');
  });

  it('switches a mounted module in place when it can', async () => {
    const fake = fakeModule('engine');
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

  it('catches up when the language changes while a module mounts', async () => {
    let open = () => {};
    const fake = fakeModule('engine', new Promise((resolve) => (open = resolve)));
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

const gone = (path: string) =>
  new TypeError(`Failed to fetch dynamically imported module: ${path}`);

function redeployed(fake: Fake, failures: number) {
  const host = document.createElement('div');
  const attempts: number[] = [];
  const statuses: string[] = [];
  const scene = new SceneSession({
    loader: {
      load: async (slug, attempt) => {
        attempts.push(attempt);
        if (attempts.length <= failures) throw gone(`${slug}.js`);
        return fake.module;
      },
    },
    host: () => host,
    callbacks: { status: (s) => statuses.push(s), controller: () => {} },
  });
  return { scene, attempts, statuses, host };
}

describe('SceneSession after a site deploy', () => {
  it('loads a fresh module once when the cached one points at chunks that are gone', async () => {
    const fake = fakeModule('engine');
    const { scene, attempts, statuses } = redeployed(fake, 1);
    await scene.show('engine', 'one');
    expect(attempts).toEqual([0, 1]);
    expect(statuses.at(-1)).toBe('ready');
    expect(fake.mounts).toHaveLength(1);
  });

  it('loads a fresh module when mounting fails on a missing language chunk', async () => {
    const fake = fakeModule('engine');
    const mount = fake.module.mount;
    let failed = false;
    fake.module.mount = async (container, options) => {
      if (!failed) {
        failed = true;
        throw gone('../../assets/de-old.js');
      }
      return mount(container, options);
    };
    const { scene, attempts, statuses, host } = redeployed(fake, 0);
    await scene.show('engine', 'one');
    expect(attempts).toEqual([0, 1]);
    expect(statuses.at(-1)).toBe('ready');
    expect(host.querySelectorAll('.scene-mount')).toHaveLength(1);
  });

  it('shows the error state when the fresh module fails too', async () => {
    const fake = fakeModule('engine');
    const { scene, attempts, statuses, host } = redeployed(fake, Infinity);
    await scene.show('engine', 'one');
    expect(attempts).toEqual([0, 1]);
    expect(statuses.at(-1)).toBe('error');
    expect(host.children).toHaveLength(0);
    await scene.show('engine', 'one', { retry: true });
    expect(attempts).toEqual([0, 1, 2, 3]);
  });

  it('does not reload a module when the browser has no WebGL context', async () => {
    const fake = fakeModule('engine');
    fake.module.mount = async () => {
      throw new Error('WebGL context could not be created');
    };
    const { scene, attempts, statuses } = redeployed(fake, 0);
    await scene.show('engine', 'one');
    expect(attempts).toEqual([0]);
    expect(statuses.at(-1)).toBe('nowebgl');
  });

  it('mounts a fresh module in the new language when the language chunk is gone', async () => {
    const fake = fakeModule('engine');
    const { scene, attempts, statuses } = redeployed(fake, 0);
    await scene.show('engine', 'one');
    const first = fake.controllers[0]!;
    first.setChapter('two');
    first.setView('labels', false);
    first.setChoice('field', 'b');
    first.pause();
    first.seek(0.3);
    first.setLanguage = vi.fn(async () => {
      throw gone('../../assets/ja-old.js');
    });
    await scene.setLanguage('ja');
    await vi.waitFor(() => expect(fake.mounts).toHaveLength(2));
    await vi.waitFor(() => expect(statuses.at(-1)).toBe('ready'));
    expect(attempts).toEqual([0, 1]);
    expect(first.dispose).toHaveBeenCalled();
    expect(fake.mounts[1]).toMatchObject({ language: 'ja', chapter: 'two' });
    expect(fake.controllers[1]!.getState()).toMatchObject({
      chapter: 'two',
      playing: false,
      progress: 0.3,
      view: { labels: false },
      choices: { field: 'b' },
    });
  });

  it('keeps the scene in its language when no fresh module loads', async () => {
    const fake = fakeModule('engine');
    let offline = false;
    const host = document.createElement('div');
    const scene = new SceneSession({
      loader: {
        load: async (slug) => {
          if (offline) throw gone(`${slug}.js`);
          return fake.module;
        },
      },
      host: () => host,
      callbacks: { status: () => {}, controller: () => {} },
    });
    await scene.show('engine', 'one');
    const first = fake.controllers[0]!;
    first.setLanguage = vi.fn(async () => {
      throw gone('../../assets/fr-old.js');
    });
    offline = true;
    await scene.setLanguage('fr');
    expect(fake.mounts).toHaveLength(1);
    expect(first.dispose).not.toHaveBeenCalled();
    expect(host.querySelectorAll('.scene-mount')).toHaveLength(1);
  });
});

describe('SceneSession after a rename', () => {
  it('reports the slug the module mounts when it differs from the one asked for', async () => {
    const fake = fakeModule('engine');
    const host = document.createElement('div');
    const renamed: [string, string][] = [];
    const loaded: string[] = [];
    const scene = new SceneSession({
      loader: {
        load: async (slug) => {
          loaded.push(slug);
          return fake.module;
        },
      },
      host: () => host,
      callbacks: {
        status: () => {},
        controller: () => {},
        renamed: (from, to) => renamed.push([from, to]),
      },
    });
    await scene.show('motor', 'one');
    expect(renamed).toEqual([['motor', 'engine']]);
    void scene.setLanguage('uk');
    await scene.show('engine', 'one');
    expect(renamed).toEqual([['motor', 'engine']]);
    expect(loaded).toEqual(['motor', 'engine']);
  });
});

describe('freshQuery', () => {
  it('asks for a copy the HTTP cache has not seen', () => {
    expect(freshQuery(() => 36 ** 3)).toBe('?v=1000');
  });
});
