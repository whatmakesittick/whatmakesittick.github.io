import { h, render } from 'preact';
import { describe, expect, it, vi } from 'vitest';
import type {
  EmbedController,
  EmbedModule,
  EmbedState,
  MountOptions,
} from '../../../src/core/embed/contract.ts';
import type { WidgetCatalogueEntry } from '../../shared/catalogue.ts';
import type { WidgetHost } from '../../widget/src/bridge.ts';
import type { Target } from '../../widget/src/state.ts';
import { useSceneSession } from '../../widget/src/useSceneSession.ts';
import { useSceneSync } from '../../widget/src/useSceneSync.ts';

const entry: WidgetCatalogueEntry = {
  slug: 'engine',
  title: 'Engine',
  eyebrow: '',
  summary: '',
  tags: [],
  cover: '',
  chapters: [
    { id: 'overview', title: 'Overview' },
    { id: 'valves', title: 'Valves' },
  ],
};

function gatedModule(gate: Promise<void>) {
  const mounts: MountOptions[] = [];
  const controllers: EmbedController[] = [];
  const module: EmbedModule = {
    apiVersion: 1,
    slug: 'engine',
    async mount(_container, options = {}) {
      mounts.push(options);
      await gate;
      let state: EmbedState = {
        chapter: options.chapter ?? 'overview',
        playing: true,
        phase: 0,
        progress: 0,
        phaseId: '',
        phaseLabel: '',
        speed: 1,
        view: {},
        choices: {},
      };
      const controller = {
        info: { slug: 'engine', language: 'en' },
        getState: () => state,
        subscribe: () => () => {},
        setChapter: vi.fn((chapter: string) => void (state = { ...state, chapter })),
        dispose: vi.fn(),
      } as unknown as EmbedController;
      controllers.push(controller);
      return controller;
    },
  };
  return { mounts, controllers, module };
}

const host = { on: () => () => {} } as unknown as WidgetHost;
const webgl = () => true;

function harness(module: EmbedModule) {
  const loader = { load: async () => module };
  const root = document.createElement('div');
  document.body.append(root);
  let chapter = '';
  function Probe({ target }: { target: Target }) {
    const scene = useSceneSession(host, loader, webgl);
    chapter = useSceneSync(scene, target, entry, false, webgl).chapter;
    return h('div', { ref: scene.refs.host });
  }
  return {
    show: (target: Target) => render(h(Probe, { target }), root),
    chapter: () => chapter,
  };
}

describe('useSceneSync', () => {
  it('loads the scene once when the chapter arrives while it mounts', async () => {
    let open = () => {};
    const fake = gatedModule(new Promise((resolve) => (open = resolve)));
    const widget = harness(fake.module);
    widget.show({ slug: 'engine' });
    await vi.waitFor(() => expect(fake.mounts).toHaveLength(1));
    widget.show({ slug: 'engine', chapter: 'valves' });
    await vi.waitFor(() => expect(widget.chapter()).toBe('valves'));
    open();
    await vi.waitFor(() => expect(fake.controllers[0]?.setChapter).toHaveBeenCalledWith('valves'));
    expect(fake.mounts).toHaveLength(1);
    expect(fake.controllers[0]?.dispose).not.toHaveBeenCalled();
  });
});
