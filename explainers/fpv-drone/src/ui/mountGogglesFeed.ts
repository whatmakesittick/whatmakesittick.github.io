import { t } from '@core/i18n';
import type { Disposer } from '@core/ui/disposers';
import { watchShallowLocalized } from '@core/ui/subscribe';
import type { CameraView, VideoId } from '../ids';
import { PRESETS } from '../state';
import type { FpvStore } from '../state';

const SCENE_SELECTOR = '#scene';
const GOGGLES_CAMERA: CameraView = 'fpv';
const NOTHING_MOUNTED: Disposer = () => undefined;

interface Feed {
  root: HTMLElement;
  caption: HTMLElement;
  video: HTMLElement;
}

function createFeed(document: Document): Feed {
  const root = document.createElement('div');
  root.className = 'goggles-feed';
  root.setAttribute('aria-hidden', 'true');
  const label = document.createElement('p');
  label.className = 'goggles-feed__label';
  const caption = document.createElement('span');
  const video = document.createElement('span');
  video.className = 'goggles-feed__video';
  label.append(caption, video);
  root.append(label);
  return { root, caption, video };
}

function show(feed: Feed, active: boolean, video: VideoId): void {
  feed.root.dataset.active = String(active);
  feed.root.dataset.video = video;
  feed.caption.textContent = t('goggles.caption');
  feed.video.textContent = t(`controls.videoOptions.${video}`);
}

export function mountGogglesFeed(root: Document, store: FpvStore): Disposer {
  const scene = root.querySelector(SCENE_SELECTOR);
  if (!scene) return NOTHING_MOUNTED;
  const feed = createFeed(root);
  scene.append(feed.root);
  const stop = watchShallowLocalized(
    store,
    (state) => [PRESETS[state.preset].camera === GOGGLES_CAMERA, state.video] as const,
    ([active, video]) => show(feed, active, video),
  );
  return () => {
    stop();
    feed.root.remove();
  };
}
